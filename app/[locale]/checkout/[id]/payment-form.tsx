"use client";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { sendMail } from "@/lib/actions/order.actions";
import { IOrder } from "@/lib/db/models/order.model";
import { formatCurrency, formatDateTime } from "@/lib/utils";

import CheckoutFooter from "../checkout-footer";
import { redirect, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import ProductPrice from "@/components/shared/product/product-price";
import useSettingStore from "@/hooks/use-setting-store";
import { useAddressData } from "@/hooks/useAddressData";

function CheckoutSummary({
  itemsPrice,
  shippingPrice,
  taxPrice,
  totalPrice,
  isPaid,
  paymentMethod,
  order,
}: {
  itemsPrice: number;
  shippingPrice?: number;
  taxPrice?: number;
  totalPrice?: number;
  isPaid: boolean;
  paymentMethod: string;
  order: IOrder;
}) {
  const router = useRouter();
  const { toast } = useToast();

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div>
            <div className="text-lg font-bold">Order Summary</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Items:</span>
                <span> {formatCurrency(itemsPrice || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping & Handling:</span>
                <span>{shippingPrice === undefined ? "--" : shippingPrice === 0 ? "FREE" : <ProductPrice price={shippingPrice} plain />}</span>
              </div>
              <div className="flex justify-between">
                <span> Tax:</span>
                {/* <span>{taxPrice === undefined ? "--" : <ProductPrice price={taxPrice} plain />}</span> */}
                <span>{taxPrice === undefined ? "--" : formatCurrency(taxPrice)}</span>
              </div>
              <div className="flex justify-between  pt-1 font-bold text-lg">
                <span> Order Total:</span>
                <span>
                  {" "}
                  {/* <ProductPrice price={totalPrice || 0} plain /> */}
                  {formatCurrency(totalPrice || 0)}
                </span>
              </div>

              {!isPaid && paymentMethod === "MoMo" && (
                <div>
                  <Button
                    onClick={async () => {
                      const res = await fetch("/api/payment/momo/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderId: order._id }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        window.location.href = data.payUrl; // Redirect đến MoMo
                      } else {
                        // console.log(data);
                        toast({ description: data.message, variant: "destructive" });
                      }
                      // sendMail(order);
                    }}
                  >
                    Thanh toán MoMo
                  </Button>
                </div>
              )}

              {!isPaid && paymentMethod === "Cash On Delivery" && (
                <Button className="w-full rounded-full" onClick={() => router.push(`/account/orders/${order._id}`)}>
                  View Order
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function OrderPaymentForm({ order }: { order: IOrder; isAdmin: boolean }) {
  const { shippingAddress, items, itemsPrice, taxPrice, shippingPrice, totalPrice, paymentMethod, expectedDeliveryDate, isPaid } = order;
  const { getCurrency } = useSettingStore();
  const { provinces = [], loading: addressLoading } = useAddressData();
  const currency = getCurrency();
  if (isPaid) {
    redirect(`/account/orders/${order._id}`);
  }

  // Get address names for display
  const getAddressNames = (provinceId: string, districtId: string, wardId: string) => {
    if (!provinces) return { provinceName: "", districtName: "", wardName: "" };

    const province = provinces.find((p) => p.Id === provinceId);
    const district = province?.Districts?.find((d) => d.Id === districtId);
    const ward = district?.Wards?.find((w) => w.Id === wardId);

    return {
      provinceName: province?.Name || "",
      districtName: district?.Name || "",
      wardName: ward?.Name || "",
    };
  };

  // Helper function to display address with names
  const getDisplayAddress = () => {
    if (!shippingAddress || !provinces) return null;

    const { provinceName, districtName, wardName } = getAddressNames(shippingAddress.province, shippingAddress.district, shippingAddress.ward);

    return (
      <>
        {shippingAddress.fullName} <br />
        {shippingAddress.street} <br />
        {wardName && `${wardName}, `}
        {districtName && `${districtName}, `}
        {provinceName}
        <br />
        {shippingAddress.phone}
      </>
    );
  };

  return (
    <main className="max-w-6xl mx-auto">
      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-3">
          {/* Shipping Address */}
          <div>
            <div className="grid md:grid-cols-3 my-3 pb-3">
              <div className="text-lg font-bold">
                <span>Shipping Address</span>
              </div>
              <div className="col-span-2">
                <p>{getDisplayAddress()}</p>
              </div>
            </div>
          </div>

          {/* payment method */}
          <div className="border-y">
            <div className="grid md:grid-cols-3 my-3 pb-3">
              <div className="text-lg font-bold">
                <span>Payment Method</span>
              </div>
              <div className="col-span-2">
                <p>{paymentMethod}</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 my-3 pb-3">
            <div className="flex text-lg font-bold">
              <span>Items and shipping</span>
            </div>
            <div className="col-span-2">
              <p>
                Delivery date:
                {formatDateTime(expectedDeliveryDate).dateOnly}
              </p>
              <ul>
                {items.map((item) => (
                  <li key={item.slug}>
                    {item.name} x {item.quantity} = {formatCurrency(item.price * currency.convertRate)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="block md:hidden">
            <CheckoutSummary itemsPrice={itemsPrice} shippingPrice={shippingPrice} taxPrice={taxPrice} totalPrice={totalPrice} isPaid={isPaid} paymentMethod={paymentMethod} order={order} />
          </div>

          <CheckoutFooter />
        </div>
        <div className="hidden md:block">
          <CheckoutSummary itemsPrice={itemsPrice} shippingPrice={shippingPrice} taxPrice={taxPrice} totalPrice={totalPrice} isPaid={isPaid} paymentMethod={paymentMethod} order={order} />
        </div>
      </div>
    </main>
  );
}
