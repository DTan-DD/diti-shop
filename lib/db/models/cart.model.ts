// 📂 lib/db/models/cart.model.ts
// ⭐ FILE MỚI - Tạo file này trong thư mục lib/db/models/

import { ShippingAddressSchema } from "@/lib/validator";
import { IShippingAddress } from "@/types";
import { Schema, model, models, Document } from "mongoose";

// Interface cho Cart Item
interface ICartItem {
  product: Schema.Types.ObjectId; // Reference to Product
  name: string;
  slug: string;
  category: string;
  image: string;
  price: number;
  color: string;
  size: string;
  quantity: number;
  countInStock: number;
  availableStock: number;
  reservedStock: number;
  clientId: string; // Unique identifier cho frontend
}

// Interface cho Cart Document
export interface ICart extends Document {
  userId: Schema.Types.ObjectId; // Reference to User
  items: ICartItem[];
  itemsPrice: number;
  taxPrice?: number;
  shippingPrice?: number;
  totalPrice: number;
  shippingAddress?: IShippingAddress;
  paymentMethod?: string;
  deliveryDateIndex?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Schema cho Cart Item (embedded)
const cartItemSchema = new Schema<ICartItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    color: {
      type: String,
      //   required: true,
    },
    size: {
      type: String,
      //   required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    countInStock: {
      type: Number,
      required: true,
      min: 0,
    },
    availableStock: {
      type: Number,
      required: true,
      min: 0,
    },
    reservedStock: {
      type: Number,
      required: true,
      min: 0,
    },
    clientId: {
      type: String,
      required: true,
    },
  },
  { _id: false } // Không tạo _id cho subdocuments
);

// Schema chính cho Cart
const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // Mỗi user chỉ có 1 cart
      index: true, // Index để query nhanh
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    taxPrice: {
      type: Number,
      min: 0,
    },
    shippingPrice: {
      type: Number,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    shippingAddress: {
      type: ShippingAddressSchema,
    },
    paymentMethod: {
      type: String,
    },
    deliveryDateIndex: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true, // Tự động tạo createdAt và updatedAt
  }
);

// Index compound để tìm items trong cart nhanh hơn
cartSchema.index({ userId: 1, "items.product": 1 });

// Export model
const Cart = models.Cart || model<ICart>("Cart", cartSchema);

export default Cart;
