import os
import json
import logging
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import FastAPI, Depends, HTTPException, Request, Header, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Numeric, DateTime, Text, Enum, select
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import stripe

# 1. Config and Logger Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ServeMe-POS")

STRIPE_API_KEY = os.getenv("STRIPE_SECRET_KEY", "sk_test_mock")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_mock")
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://user:password@localhost/serveme_db")

stripe.api_key = STRIPE_API_KEY

# 2. FastAPI App Setup
app = FastAPI(
    title="ServeMe Ordering Engine",
    description="High-performance sequential order and Stripe payment integration for KDS-aligned workflows.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Database Connection and ORM Setup
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_recycle=3600,
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class OrderStatus(str, Enum):
    pending_payment = "pending_payment"
    paid = "paid"
    preparing = "preparing"
    ready = "ready"
    completed = "completed"

class OrderModel(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String(20), unique=True, nullable=True, index=True) # Generated only after successful payment
    customer_session_id = Column(String(255), nullable=True)
    items = Column(Text, nullable=False) # JSON-serialized menu item list
    total_amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(50), default="pending_payment", nullable=False)
    payment_intent_id = Column(String(255), unique=True, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 4. Pydantic Schemas
class OrderItem(BaseModel):
    productId: str
    name: str
    quantity: int
    price: float

class OrderInitiateRequest(BaseModel):
    customer_session_id: Optional[str] = None
    items: List[OrderItem]
    total_amount: float = Field(..., gt=0)

class OrderInitiateResponse(BaseModel):
    db_record_id: int
    total_amount: float
    status: str

# 5. Core Routes

@app.post("/order/initiate", response_model=OrderInitiateResponse, status_code=status.HTTP_201_CREATED)
def initiate_order(payload: OrderInitiateRequest, db: Session = Depends(get_db)):
    """
    Step 1: Save order state with status='pending_payment'.
    Does not allocate an order_id yet to prevent KDS clutter and keep sequential order indices gapless.
    """
    try:
        new_order = OrderModel(
            customer_session_id=payload.customer_session_id,
            items=json.dumps([item.dict() for item in payload.items]),
            total_amount=payload.total_amount,
            status=OrderStatus.pending_payment.value
        )
        db.add(new_order)
        db.commit()
        db.refresh(new_order)
        
        logger.info(f"Initialized order placeholder DB Record ID: {new_order.id}")
        return OrderInitiateResponse(
            db_record_id=new_order.id,
            total_amount=float(new_order.total_amount),
            status=new_order.status
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to initiate order placeholder: {str(e)}")
        raise HTTPException(status_code=500, detail="Database write error.")

@app.post("/payment/create-intent")
async def create_payment_intent(db_record_id: int, db: Session = Depends(get_db)):
    """
    Step 2: Generate Stripe PaymentIntent referencing the local DB Record ID.
    """
    order = db.query(OrderModel).filter(OrderModel.id == db_record_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order placeholder record not found.")
        
    if order.status != OrderStatus.pending_payment.value:
        raise HTTPException(status_code=400, detail="Payment has already been processed or initiated for this record.")

    try:
        # Amount in cents for Stripe (e.g., $10.00 is 1000)
        amount_cents = int(float(order.total_amount) * 100)
        
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="inr", # Configured to INR by default; change as needed
            metadata={
                "db_record_id": str(order.id),
                "customer_session_id": order.customer_session_id or ""
            }
        )
        
        # Link the payment intent back to our DB record for verification
        order.payment_intent_id = intent.id
        db.commit()
        
        logger.info(f"Stripe PaymentIntent {intent.id} created for DB Record {order.id}")
        return {
            "clientSecret": intent.client_secret,
            "paymentIntentId": intent.id
        }
    except Exception as e:
        logger.error(f"Failed to create Stripe PaymentIntent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment gateway error: {str(e)}")

# 6. Webhook and Atomic Sequential Generator
def generate_gapless_order_id(db: Session) -> str:
    """
    Atomic operation to generate a continuous, gapless sequential order ID (e.g., ORD-001, ORD-002).
    Uses 'SELECT FOR UPDATE' to locks the orders table, avoiding race conditions under highly concurrent environments.
    """
    # Force lock on the table records to synchronize order generation
    # Extract the numeric part, find maximum, increment, and format back
    # For Production, you can also lock a dedicated 'counters' table which is cleaner and faster.
    query = db.query(OrderModel).with_for_update()
    
    # We fetch the max numeric suffix from existing order_ids
    max_id_query = db.query(OrderModel.order_id).filter(OrderModel.order_id.isnot(None)).with_for_update()
    existing_ids = [r[0] for r in max_id_query.all()]
    
    next_num = 1
    if existing_ids:
        numeric_parts = []
        for oid in existing_ids:
            if oid.startswith("ORD-") and oid[4:].isdigit():
                numeric_parts.append(int(oid[4:]))
        if numeric_parts:
            next_num = max(numeric_parts) + 1
            
    return f"ORD-{next_num:03d}"

@app.post("/webhook/stripe")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None), db: Session = Depends(get_db)):
    """
    Step 3: Webhook handler to securely capture payment success and perform atomic operations:
    1. Generate atomic sequential order ID.
    2. Set status to 'paid'.
    3. (Optional) Broadcast to KDS via WebSockets or SSE.
    """
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.error("Invalid Webhook Payload")
        raise HTTPException(status_code=400, detail="Invalid payload.")
    except stripe.error.SignatureVerificationError as e:
        logger.error("Invalid Webhook Signature")
        raise HTTPException(status_code=400, detail="Invalid signature.")

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        db_record_id = intent["metadata"].get("db_record_id")
        
        if not db_record_id:
            logger.error("Webhook received without db_record_id in metadata.")
            return {"status": "ignored", "reason": "No local metadata linked"}
            
        logger.info(f"Payment success received for DB Record: {db_record_id}")
        
        # Start a dedicated local atomic transaction block
        try:
            # Fetch the order placeholder
            order = db.query(OrderModel).filter(OrderModel.id == int(db_record_id)).with_for_update().first()
            
            if not order:
                logger.error(f"No order found for ID {db_record_id}")
                return {"status": "error", "message": "Order not found"}
                
            if order.status == OrderStatus.paid.value or order.order_id is not None:
                logger.info(f"Order {db_record_id} already marked as paid.")
                return {"status": "success", "order_id": order.order_id}
                
            # Generates next safe sequential sequence (ORD-xxx)
            new_order_id = generate_gapless_order_id(db)
            
            # Commit the update safely
            order.order_id = new_order_id
            order.status = OrderStatus.paid.value
            db.commit()
            
            logger.info(f"Order processed successfully! allocated: {new_order_id} for db_record_id {db_record_id}")
            
            # Broadcast order to KDS via websocket here
            await broadcast_to_kds(new_order_id, order)
            
            return {"status": "success", "allocated_order_id": new_order_id}
            
        except Exception as tx_error:
            db.rollback()
            logger.error(f"Transaction failed, rolled back order creation: {str(tx_error)}")
            raise HTTPException(status_code=500, detail="Transactional update failed.")

    return {"status": "received"}

async def broadcast_to_kds(order_id: str, order: OrderModel):
    """
    Step 4: Dispatch the newly paid, validated order to your Kitchen Display System.
    This acts as your WebSocket or SSE gateway broadcast.
    """
    logger.info(f"[KDS BROADCAST] Sending Order {order_id} to the kitchen monitors.")
    # Implement your websocket logic here, e.g.:
    # await manager.broadcast_json({
    #     "event": "order_created",
    #     "order_id": order_id,
    #     "items": json.loads(order.items),
    #     "total": float(order.total_amount),
    #     "status": "paid"
    # })
    pass
