"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateUserAddress } from "@/lib/actions/user.actions";
import { UserAddressSchema } from "@/lib/validator";
import { useAddressData } from "@/hooks/useAddressData";

export const ProfileForm = () => {
  const router = useRouter();
  const { data: session, update } = useSession();
  console.log(session);
  const { toast } = useToast();

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

  const form = useForm<z.infer<typeof UserAddressSchema>>({
    resolver: zodResolver(UserAddressSchema) as Resolver<z.infer<typeof UserAddressSchema>>,
    defaultValues: {
      fullName: session?.user?.address?.fullName || "",
      country: session?.user?.address?.country || "Vietnam",
      province: session?.user?.address?.province || "",
      district: session?.user?.address?.district || "",
      ward: session?.user?.address?.ward || "",
      street: session?.user?.address?.street || "",
    },
  });

  // useEffect(() => {
  //   if (districts && session?.user?.address?.district) {
  //     form.setValue("district", session.user.address.district);
  //   }
  // }, [districts]);

  // useEffect(() => {
  //   if (wards && session?.user?.address?.ward) {
  //     form.setValue("ward", session.user.address.ward);
  //   }
  // }, [wards]);

  // Initialize cascading selects when session data loads
  // Combined effect approach
  // Initialize cascading selects when session data loads
  useEffect(() => {
    if (!session?.user?.address || provinces.length === 0) return;
    const { province } = session.user.address;
    if (province) {
      setSelectedProvinceId(province);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.address, provinces.length]);

  // Update district when province changes
  useEffect(() => {
    if (districts.length > 0 && session?.user?.address?.district) {
      setSelectedDistrictId(session.user.address.district);
      form.setValue("district", session.user.address.district);
    }
  }, [districts.length, session?.user?.address?.district]);

  // Update ward when district changes
  useEffect(() => {
    if (wards.length > 0 && session?.user?.address?.ward) {
      setSelectedWardId(session.user.address.ward);
      form.setValue("ward", session.user.address.ward);
    }
  }, [wards.length, session?.user?.address?.ward]);

  async function onSubmit(values: z.infer<typeof UserAddressSchema>) {
    const addressData = {
      ...values,
      province: selectedProvinceId,
      district: selectedDistrictId,
      ward: selectedWardId,
      fullName: values.fullName.trim(),
    };

    console.log(addressData);

    const res = await updateUserAddress(addressData);

    if (!res.success) {
      return toast({
        variant: "destructive",
        description: res.message,
      });
    }

    const { data, message } = res;
    const newSession = {
      ...session,
      user: {
        ...session?.user,
        address: data.address ?? session?.user?.address,
      },
    };

    await update(newSession);

    toast({
      description: message,
    });

    router.push("/account");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Full Name */}
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Họ tên</FormLabel>
              <FormControl>
                <Input placeholder="Họ tên" {...field} className="input-field" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Province Select */}
        <FormField
          control={form.control}
          name="province"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Tỉnh/Thành phố</FormLabel>
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
          control={form.control}
          name="district"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Quận/Huyện</FormLabel>
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
          control={form.control}
          name="ward"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Phường/Xã</FormLabel>
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

        {/* Street Input */}
        <FormField
          control={form.control}
          name="street"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Địa chỉ cụ thể</FormLabel>
              <FormControl>
                <Input placeholder="Số nhà, tên đường" {...field} className="input-field" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="button col-span-2 w-full">
          {form.formState.isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </form>
    </Form>
  );
};
