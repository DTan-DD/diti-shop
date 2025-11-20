/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createOrder } from "@/lib/actions/order.actions";
import { calculateFutureDate, formatDateTime } from "@/lib/utils";
import { ShippingAddressSchema } from "@/lib/validator";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import CheckoutFooter from "./checkout-footer";
import { CheckoutSummaryProps, ShippingAddress } from "@/types";
import useIsMounted from "@/hooks/use-is-mounted";
import Link from "next/link";
import useCartStore from "@/hooks/use-cart-store";
import useSettingStore from "@/hooks/use-setting-store";
import ProductPrice from "@/components/shared/product/product-price";
import { useAddressData } from "@/hooks/useAddressData";
import { useSession } from "next-auth/react";
import { useCartValidation } from "@/hooks/useCartValidation";
import CartValidationDialog from "@/components/shared/CartValidationDialog";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getUserById } from "@/lib/actions/user.actions";
import { validateCartStock } from "@/lib/actions/cart-db.actions";

const shippingAddressDefaultValues =
  process.env.NODE_ENV === "development"
    ? {
        fullName: "Nguyễn Văn AV",
        street: "",
        city: "79", // Thành phố Hồ Chí Minh
        province: "", // Quận 1
        postalCode: "700000",
        phone: "",
        country: "Vietnam",
        district: "760",
        ward: "26737", // Phường Bến Nghé
      }
    : {
        fullName: "",
        street: "",
        city: "",
        province: "",
        phone: "",
        postalCode: "",
        country: "Vietnam",
        ward: "",
        district: "",
      };

function CheckoutSummary({
  isAddressSelected,
  isPaymentMethodSelected,
  handleSelectShippingAddress,
  handleSelectPaymentMethod,
  handlePlaceOrder,
  itemsPrice,
  shippingPrice,
  taxPrice,
  totalPrice,
  isPlacingOrder,
  validationState,
  items,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: CheckoutSummaryProps & { isPlacingOrder: boolean; validationState: any }) {
  const {
    setting: { site },
  } = useSettingStore();
  return (
    <>
      <Card>
        <CardContent className="p-4">
          {!isAddressSelected && (
            <div className="border-b mb-4">
              <Button className="rounded-full w-full" onClick={handleSelectShippingAddress}>
                Giao đến địa chỉ này
              </Button>
              <p className="text-xs text-center py-2">Chọn địa chỉ giao hàng và phương thức thanh toán để tính phí vận chuyển và thuế.</p>
            </div>
          )}
          {isAddressSelected && !isPaymentMethodSelected && (
            <div className=" mb-4">
              <Button className="rounded-full w-full" onClick={handleSelectPaymentMethod}>
                Sử dụng phương thức thanh toán này
              </Button>
              <p className="text-xs text-center py-2">Chọn phương thức thanh toán để tiếp tục. Bạn vẫn có thể xem lại và chỉnh sửa đơn hàng trước khi hoàn tất.</p>
            </div>
          )}
          {isPaymentMethodSelected && isAddressSelected && (
            <div>
              {/* <Button onClick={handlePlaceOrder} className="rounded-full w-full">
                Đặt hàng
              </Button> */}
              <Button onClick={handlePlaceOrder} className="rounded-full w-full" disabled={isPlacingOrder || validationState.isValidating || items.length === 0}>
                {isPlacingOrder || validationState.isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {validationState.isValidating ? "Checking stock..." : "Placing order..."}
                  </>
                ) : (
                  "Place Order"
                )}
              </Button>
              <p className="text-xs text-center py-2">
                Bằng việc đặt hàng, bạn đồng ý với <Link href="/page/privacy-policy">chính sách bảo mật</Link> và
                <Link href="/page/conditions-of-use"> điều khoản sử dụng</Link> của {site.name}.
              </p>
            </div>
          )}

          <div>
            <div className="text-lg font-bold">Tóm tắt đơn hàng</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Sản phẩm:</span>
                <span>
                  <ProductPrice price={itemsPrice} plain />
                </span>
              </div>
              <div className="flex justify-between">
                <span>Phí vận chuyển:</span>
                <span>{shippingPrice === undefined ? "--" : shippingPrice === 0 ? "MIỄN PHÍ" : <ProductPrice price={shippingPrice} plain />}</span>
              </div>
              <div className="flex justify-between">
                <span>Thuế:</span>
                <span>{taxPrice === undefined ? "--" : <ProductPrice price={taxPrice} plain />}</span>
              </div>
              <div className="flex justify-between  pt-4 font-bold text-lg">
                <span>Tổng cộng:</span>
                <span>
                  <ProductPrice price={totalPrice || 0} plain />
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

const CheckoutForm = () => {
  const { toast } = useToast();
  const { data: session } = useSession();
  const router = useRouter();
  const { data: user } = useQuery<{ phone?: string; address?: { fullName?: string; country?: string; province?: string; district?: string; ward?: string; street?: string } }>({
    queryKey: ["user", "profile"],
    queryFn: async () => await getUserById(), // ✅ QUAN TRỌNG: thêm queryFn
  });
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const { validateCart, fixCartAndContinue, removeOutOfStockItems, closeDialog, validationState } = useCartValidation();

  const {
    setting: { site, availablePaymentMethods, defaultPaymentMethod, availableDeliveryDates },
  } = useSettingStore();

  const {
    cart: { items, itemsPrice, shippingPrice, taxPrice, totalPrice, shippingAddress, deliveryDateIndex, paymentMethod = defaultPaymentMethod },
    setShippingAddress,
    setPaymentMethod,
    updateItem,
    removeItem,
    clearCart,
    setDeliveryDateIndex,
    syncWithDB,
    isLoggedIn,
  } = useCartStore();
  const isMounted = useIsMounted();

  // Load address data
  const { provinces = [], loading: addressLoading } = useAddressData();

  // State for cascading selects
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [selectedWardId, setSelectedWardId] = useState<string>("");

  // Memoized data for districts and wards
  const districts = useMemo(() => {
    if (!provinces || !selectedProvinceId) return [];
    const province = provinces.find((p) => p.Id === selectedProvinceId);
    return province?.Districts || [];
  }, [provinces, selectedProvinceId]);

  const wards = useMemo(() => {
    if (!districts || !selectedDistrictId) return [];
    const district = districts.find((d) => d.Id === selectedDistrictId);
    return district?.Wards || [];
  }, [districts, selectedDistrictId]);

  const shippingAddressForm = useForm<ShippingAddress>({
    resolver: zodResolver(ShippingAddressSchema),
    defaultValues: shippingAddress || shippingAddressDefaultValues,
  });

  useEffect(() => {
    shippingAddressForm.setValue("phone", user?.phone || "");
    shippingAddressForm.setValue("fullName", user?.address?.fullName || "");
    shippingAddressForm.setValue("country", user?.address?.country || "Vietnam");
    shippingAddressForm.setValue("province", user?.address?.province || "");
    shippingAddressForm.setValue("district", user?.address?.district || "");
    shippingAddressForm.setValue("ward", user?.address?.ward || "");
    shippingAddressForm.setValue("street", user?.address?.street || "");
  }, [user]);

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

  const onSubmitShippingAddress: SubmitHandler<ShippingAddress> = (values) => {
    // Store only IDs, not names
    const addressData = {
      ...values,
      // city: selectedProvinceId,
      province: selectedProvinceId,
      district: selectedDistrictId,
      ward: selectedWardId,
    };

    setShippingAddress(addressData);
    setIsAddressSelected(true);
  };

  useEffect(() => {
    if (!user?.address || provinces.length === 0) return;

    const userAddress = user.address;

    // Load user's saved address
    if (userAddress.province) {
      setSelectedProvinceId((prev) => (prev !== userAddress.province ? userAddress.province || "" : prev));
      shippingAddressForm.setValue("province", userAddress.province);
    }
    if (userAddress.street) {
      shippingAddressForm.setValue("street", userAddress.street);
    }
  }, [user?.address, provinces.length]);

  useEffect(() => {
    if (!user?.address || districts.length === 0) return;
    const userAddress = user.address;
    if (districts.length > 0 && userAddress.district) {
      setSelectedDistrictId((prev) => (prev !== userAddress.district ? userAddress.district || "" : prev));
      shippingAddressForm.setValue("district", userAddress.district);
    }
  }, [districts.length, user?.address?.district]);

  useEffect(() => {
    if (!user?.address || wards.length === 0) return;
    const userAddress = user.address;
    if (wards.length > 0 && userAddress.ward) {
      setSelectedWardId((prev) => (prev !== userAddress.ward ? userAddress.ward || "" : prev));
      shippingAddressForm.setValue("ward", userAddress.ward);
    }
  }, [wards.length, user?.address?.ward]);

  // Also add user?.name and phone to form
  useEffect(() => {
    if (!user) return;

    if (user.address?.fullName) {
      shippingAddressForm.setValue("fullName", user.address.fullName);
    }
    if (user.phone) {
      shippingAddressForm.setValue("phone", user.phone);
    }
  }, [session?.user]);

  const [isAddressSelected, setIsAddressSelected] = useState<boolean>(false);
  const [isPaymentMethodSelected, setIsPaymentMethodSelected] = useState<boolean>(false);
  const [isDeliveryDateSelected, setIsDeliveryDateSelected] = useState<boolean>(false);

  const handlePlaceOrder = async () => {
    try {
      setIsPlacingOrder(true);

      // ============================================
      // ⭐ STEP 0: Final sync to DB (if logged in)
      // ============================================
      if (isLoggedIn) {
        console.log("🔄 Final cart sync before order...");
        await syncWithDB();

        // Wait a bit for sync to complete
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // ============================================
      // ⭐ STEP 1: Validate stock one more time
      // ============================================
      console.log("✅ Validating cart stock...");
      const stockValidation = await validateCartStock(items);

      if (stockValidation.hasIssues) {
        // Show detailed warnings
        toast({
          title: "Cart Validation Failed",
          description: (
            <div className="space-y-1">
              <p className="font-medium">Please review your cart:</p>
              <ul className="list-disc pl-4 text-sm">
                {stockValidation.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          ),
          variant: "destructive",
          duration: 10000,
        });

        setIsPlacingOrder(false);

        // Optionally: Redirect to cart page
        router.push("/cart");
        return;
      }

      // ============================================
      // STEP 2: Validate delivery info (existing)
      // ============================================
      if (!shippingAddress) {
        toast({
          title: "Missing Information",
          description: "Please provide shipping address",
          variant: "destructive",
        });
        setIsPlacingOrder(false);
        return;
      }

      if (!paymentMethod) {
        toast({
          title: "Missing Information",
          description: "Please select a payment method",
          variant: "destructive",
        });
        setIsPlacingOrder(false);
        return;
      }

      if (deliveryDateIndex === undefined) {
        toast({
          title: "Missing Information",
          description: "Please select a delivery date",
          variant: "destructive",
        });
        setIsPlacingOrder(false);
        return;
      }

      // ============================================
      // STEP 3: Create order
      // ============================================
      console.log("📦 Creating order...");
      const res = await createOrder({
        items,
        shippingAddress,
        expectedDeliveryDate: calculateFutureDate(availableDeliveryDates[deliveryDateIndex].daysToDeliver),
        deliveryDateIndex,
        paymentMethod,
        itemsPrice,
        shippingPrice,
        taxPrice,
        totalPrice,
      });

      // ============================================
      // STEP 4: Handle order response
      // ============================================
      if (!res.success) {
        // Check if error is stock-related
        if (res.message.includes("stock") || res.message.includes("available")) {
          // Re-validate to show updated info
          await validateCartStock(items);

          toast({
            title: "Stock Issue",
            description: "Some items in your cart are no longer available. Please review your cart.",
            variant: "destructive",
          });

          router.push("/cart");
        } else {
          // Other errors
          toast({
            title: "Order Failed",
            description: res.message,
            variant: "destructive",
          });
        }

        setIsPlacingOrder(false);
        return;
      }

      // ============================================
      // ⭐ STEP 5: Success - Clear cart (syncs to DB)
      // ============================================
      console.log("✅ Order created successfully");

      toast({
        title: "Order Placed!",
        description: res.message || "Your order has been placed successfully",
      });

      // Clear cart (will auto-sync to DB if logged in)
      clearCart();

      // Redirect to order confirmation
      // router.push(`/checkout/${res.data?.orderId}`);
      console.log("res.data?.orderId", res.data?.orderId);
      setTimeout(() => {
        router.push(`/checkout/${res.data?.orderId}`);
      }, 200);
      // console.log("availableDeliveryDates[deliveryDateIndex!].daysToDeliver", availableDeliveryDates[deliveryDateIndex!].daysToDeliver);
      // router.push(`/`);
    } catch (error: any) {
      console.error("❌ Place order error:", error);

      toast({
        title: "Error",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive",
      });

      setIsPlacingOrder(false);
    }
  };

  const handleFixCart = async () => {
    const success = await fixCartAndContinue();

    if (success) {
      toast.success("Cart updated. You can now place your order.");
      // Tự động place order sau khi fix
      await handlePlaceOrder();
    }
  };

  const handleRemoveItems = () => {
    removeOutOfStockItems();
    toast.info("Out of stock items removed from cart");
  };

  const handleSelectPaymentMethod = () => {
    setIsAddressSelected(true);
    setIsPaymentMethodSelected(true);
  };

  const handleSelectShippingAddress = () => {
    shippingAddressForm.handleSubmit(onSubmitShippingAddress)();
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
    <main className="max-w-6xl mx-auto highlight-link">
      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-3">
          {/* shipping address */}
          <div>
            {isAddressSelected && shippingAddress ? (
              <div className="grid grid-cols-1 md:grid-cols-12 my-3 pb-3">
                <div className="col-span-5 flex text-lg font-bold ">
                  <span className="w-8">1 </span>
                  <span>Địa chỉ giao hàng</span>
                </div>
                <div className="col-span-5 ">
                  <p>{getDisplayAddress()}</p>
                </div>
                <div className="col-span-2">
                  <Button
                    variant={"outline"}
                    onClick={() => {
                      setIsAddressSelected(false);
                      setIsPaymentMethodSelected(false);
                      setIsDeliveryDateSelected(false);
                    }}
                  >
                    Thay đổi
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex text-primary text-lg font-bold my-2">
                  <span className="w-8">1 </span>
                  <span>Nhập địa chỉ giao hàng</span>
                </div>
                <Form {...shippingAddressForm}>
                  <form method="post" onSubmit={shippingAddressForm.handleSubmit(onSubmitShippingAddress)} className="space-y-4">
                    <Card className="md:ml-8 my-4">
                      <CardContent className="p-4 space-y-4">
                        <div className="text-lg font-bold mb-2">Địa chỉ của bạn</div>

                        <FormField
                          control={shippingAddressForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Họ và tên</FormLabel>
                              <FormControl>
                                <Input placeholder="Nhập họ và tên" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={shippingAddressForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Số điện thoại</FormLabel>
                              <FormControl>
                                <Input placeholder="Nhập số điện thoại" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Province/City Select */}
                        <FormField
                          control={shippingAddressForm.control}
                          name="province"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tỉnh/Thành phố</FormLabel>
                              <Select
                                disabled={addressLoading || !provinces}
                                value={selectedProvinceId}
                                onValueChange={(value) => {
                                  setSelectedProvinceId(value);
                                  setSelectedDistrictId("");
                                  setSelectedWardId("");
                                  field.onChange(value);
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full!">
                                    <SelectValue placeholder="Chọn Tỉnh/Thành phố" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {provinces?.map((province) => (
                                    <SelectItem key={province.Id} value={province.Id}>
                                      {province.Name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* District Select */}
                        <FormField
                          control={shippingAddressForm.control}
                          name="district"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quận/Huyện</FormLabel>
                              <Select
                                disabled={!selectedProvinceId || districts.length === 0}
                                value={selectedDistrictId}
                                onValueChange={(value) => {
                                  setSelectedDistrictId(value);
                                  setSelectedWardId("");
                                  field.onChange(value);
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full!">
                                    <SelectValue placeholder="Chọn Quận/Huyện" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {districts.map((district) => (
                                    <SelectItem key={district.Id} value={district.Id}>
                                      {district.Name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Ward Select */}
                        <FormField
                          control={shippingAddressForm.control}
                          name="ward"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phường/Xã</FormLabel>
                              <Select
                                disabled={!selectedDistrictId || wards.length === 0}
                                value={selectedWardId}
                                onValueChange={(value) => {
                                  setSelectedWardId(value);
                                  field.onChange(value);
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full!">
                                    <SelectValue placeholder="Chọn Phường/Xã" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {wards.map((ward) => (
                                    <SelectItem key={ward.Id} value={ward.Id}>
                                      {ward.Name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={shippingAddressForm.control}
                          name="street"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Địa chỉ cụ thể</FormLabel>
                              <FormControl>
                                <Input placeholder="Số nhà, tên đường" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                      <CardFooter className="p-4">
                        <Button type="submit" className="rounded-full font-bold">
                          Giao đến địa chỉ này
                        </Button>
                      </CardFooter>
                    </Card>
                  </form>
                </Form>
              </>
            )}
          </div>

          {/* payment method */}
          <div className="border-y">
            {isPaymentMethodSelected && paymentMethod ? (
              <div className="grid grid-cols-1 md:grid-cols-12 my-3 pb-3">
                <div className="flex text-lg font-bold col-span-5">
                  <span className="w-8">2 </span>
                  <span>Phương thức thanh toán</span>
                </div>
                <div className="col-span-5 ">
                  <p>{paymentMethod}</p>
                </div>
                <div className="col-span-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsPaymentMethodSelected(false);
                      if (paymentMethod) setIsDeliveryDateSelected(true);
                    }}
                  >
                    Thay đổi
                  </Button>
                </div>
              </div>
            ) : isAddressSelected ? (
              <>
                <div className="flex text-primary text-lg font-bold my-2">
                  <span className="w-8">2 </span>
                  <span>Chọn phương thức thanh toán</span>
                </div>
                <Card className="md:ml-8 my-4">
                  <CardContent className="p-4">
                    <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value)}>
                      {availablePaymentMethods.map((pm) => (
                        <div key={pm.name} className="flex items-center py-1 ">
                          <RadioGroupItem value={pm.name} id={`payment-${pm.name}`} />
                          <Label className="font-bold pl-2 cursor-pointer" htmlFor={`payment-${pm.name}`}>
                            {pm.name}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                  <CardFooter className="p-4">
                    <Button onClick={handleSelectPaymentMethod} className="rounded-full font-bold">
                      Sử dụng phương thức này
                    </Button>
                  </CardFooter>
                </Card>
              </>
            ) : (
              <div className="flex text-muted-foreground text-lg font-bold my-4 py-3">
                <span className="w-8">2 </span>
                <span>Chọn phương thức thanh toán</span>
              </div>
            )}
          </div>

          {/* items and delivery date */}
          <div>
            {isDeliveryDateSelected && deliveryDateIndex != undefined ? (
              <div className="grid grid-cols-1 md:grid-cols-12 my-3 pb-3">
                <div className="flex text-lg font-bold col-span-5">
                  <span className="w-8">3 </span>
                  <span>Sản phẩm và vận chuyển</span>
                </div>
                <div className="col-span-5">
                  <p>Ngày giao hàng: {formatDateTime(calculateFutureDate(availableDeliveryDates[deliveryDateIndex].daysToDeliver)).dateOnly}</p>
                  <ul>
                    {items.map((item, _index) => (
                      <li key={_index}>
                        {item.name} x {item.quantity} = {item.price}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="col-span-2">
                  <Button
                    variant={"outline"}
                    onClick={() => {
                      setIsPaymentMethodSelected(true);
                      setIsDeliveryDateSelected(false);
                    }}
                  >
                    Thay đổi
                  </Button>
                </div>
              </div>
            ) : isPaymentMethodSelected && isAddressSelected ? (
              <>
                <div className="flex text-primary text-lg font-bold my-2">
                  <span className="w-8">3 </span>
                  <span>Xem lại sản phẩm và vận chuyển</span>
                </div>
                <Card className="md:ml-8">
                  <CardContent className="p-4">
                    <p className="mb-2">
                      <span className="text-lg font-bold text-green-700">
                        Giao hàng {deliveryDateIndex !== undefined && formatDateTime(calculateFutureDate(availableDeliveryDates[deliveryDateIndex].daysToDeliver)).dateOnly}
                      </span>
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        {items.map((item, _index) => (
                          <div key={_index} className="flex gap-4 py-2">
                            <div className="relative w-16 h-16">
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                sizes="20vw"
                                style={{
                                  objectFit: "contain",
                                }}
                              />
                            </div>

                            <div className="flex-1">
                              <p className="font-semibold">
                                {item.name}, {item.color}, {item.size}
                              </p>
                              <p className="font-bold">
                                <ProductPrice price={item.price} plain />
                              </p>

                              <Select
                                value={item.quantity.toString()}
                                onValueChange={(value) => {
                                  if (value === "0") removeItem(item.clientId);
                                  else updateItem(item, Number(value));
                                }}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue>SL: {item.quantity}</SelectValue>
                                </SelectTrigger>
                                <SelectContent position="popper">
                                  {Array.from({
                                    length: item.countInStock,
                                  }).map((_, i) => (
                                    <SelectItem key={i + 1} value={`${i + 1}`}>
                                      {i + 1}
                                    </SelectItem>
                                  ))}
                                  <SelectItem key="delete" value="0">
                                    Xóa
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="font-bold">
                          <p className="mb-2">Chọn tốc độ giao hàng:</p>

                          <ul>
                            <RadioGroup
                              value={typeof deliveryDateIndex === "number" ? availableDeliveryDates[deliveryDateIndex]?.name : undefined}
                              onValueChange={(value) => setDeliveryDateIndex(availableDeliveryDates.findIndex((address) => address.name === value)!)}
                            >
                              {availableDeliveryDates.map((dd) => (
                                <div key={dd.name} className="flex">
                                  <RadioGroupItem value={dd.name} id={`address-${dd.name}`} />
                                  <Label className="pl-2 flex flex-col items-start cursor-pointer" htmlFor={`address-${dd.name}`}>
                                    <div className="text-green-700 font-semibold">{formatDateTime(calculateFutureDate(dd.daysToDeliver)).dateOnly}</div>
                                    <div>
                                      {(dd.freeShippingMinPrice > 0 && itemsPrice >= dd.freeShippingMinPrice ? 0 : dd.shippingPrice) === 0 ? (
                                        "MIỄN PHÍ vận chuyển"
                                      ) : (
                                        <ProductPrice price={dd.shippingPrice} plain />
                                      )}
                                    </div>
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex text-muted-foreground text-lg font-bold my-4 py-3">
                <span className="w-8">3 </span>
                <span>Sản phẩm và vận chuyển</span>
              </div>
            )}
          </div>

          {isPaymentMethodSelected && isAddressSelected && (
            <div className="mt-6">
              <div className="block md:hidden">
                <CheckoutSummary
                  isAddressSelected={isAddressSelected}
                  isPaymentMethodSelected={isPaymentMethodSelected}
                  handleSelectShippingAddress={handleSelectShippingAddress}
                  handleSelectPaymentMethod={handleSelectPaymentMethod}
                  handlePlaceOrder={handlePlaceOrder}
                  itemsPrice={itemsPrice}
                  shippingPrice={shippingPrice}
                  taxPrice={taxPrice}
                  totalPrice={totalPrice}
                  isPlacingOrder={isPlacingOrder}
                  validationState={validationState}
                  items={items}
                />
              </div>

              <Card className="hidden md:block ">
                <CardContent className="p-4 flex flex-col md:flex-row justify-between items-center gap-3">
                  <Button onClick={handlePlaceOrder} className="rounded-full" disabled={isPlacingOrder || validationState.isValidating || items.length === 0}>
                    {/* Đặt hàng */}
                    {isPlacingOrder || validationState.isValidating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {validationState.isValidating ? "Checking stock..." : "Placing order..."}
                      </>
                    ) : (
                      "Place Order"
                    )}
                  </Button>
                  <div className="flex-1">
                    <p className="font-bold text-lg">
                      Tổng cộng: <ProductPrice price={totalPrice} plain />
                    </p>
                    <p className="text-xs">
                      Bằng việc đặt hàng, bạn đồng ý với <Link href="/page/privacy-policy">chính sách bảo mật</Link> và
                      <Link href="/page/conditions-of-use"> điều khoản sử dụng</Link> của {site.name}.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <CheckoutFooter />
        </div>
        <div className="hidden md:block">
          <CheckoutSummary
            isAddressSelected={isAddressSelected}
            isPaymentMethodSelected={isPaymentMethodSelected}
            handleSelectShippingAddress={handleSelectShippingAddress}
            handleSelectPaymentMethod={handleSelectPaymentMethod}
            handlePlaceOrder={handlePlaceOrder}
            itemsPrice={itemsPrice}
            shippingPrice={shippingPrice}
            taxPrice={taxPrice}
            totalPrice={totalPrice}
            isPlacingOrder={isPlacingOrder}
            validationState={validationState}
            items={items}
          />
        </div>
      </div>
      {/* Validation Dialog */}
      <CartValidationDialog
        open={validationState.showDialog}
        onClose={closeDialog}
        errors={validationState.errors}
        warnings={validationState.warnings}
        hasErrors={validationState.hasErrors}
        hasWarnings={validationState.hasWarnings}
        onFixCart={handleFixCart}
        onRemoveItems={handleRemoveItems}
      />
    </main>
  );
};

export default CheckoutForm;
