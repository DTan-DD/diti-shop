"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Resolver, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createProduct, updateProduct } from "@/lib/actions/product.actions";
import { IProduct } from "@/lib/db/models/product.model";
import { UploadButton } from "@/lib/uploadthing";
import { ProductInputSchema, ProductUpdateSchema } from "@/lib/validator";
import { Checkbox } from "@/components/ui/checkbox";
import { toSlug } from "@/lib/utils";
import z from "zod";
import { JSX } from "react/jsx-runtime";
import { Trash } from "lucide-react";

// ✅ Định nghĩa types từ Zod schema
type IProductInput = z.infer<typeof ProductInputSchema>;
type IProductUpdate = z.infer<typeof ProductUpdateSchema>;

const productDefaultValues: IProductInput =
  process.env.NODE_ENV === "development"
    ? {
        name: "Sample Product",
        slug: "sample-product",
        category: "Sample Category",
        images: ["/images/p11-1.jpg"],
        brand: "Sample Brand",
        description: "This is a sample description of the product.",
        price: 99.99,
        listPrice: 0,
        countInStock: 15,
        availableStock: 15,
        reservedStock: 0,
        numReviews: 0,
        avgRating: 0,
        numSales: 0,
        isPublished: false,
        tags: [],
        sizes: [],
        colors: [],
        ratingDistribution: [],
        reviews: [],
      }
    : {
        name: "",
        slug: "",
        category: "",
        images: [],
        brand: "",
        description: "",
        price: 0,
        listPrice: 0,
        countInStock: 0,
        availableStock: 0,
        reservedStock: 0,
        numReviews: 0,
        avgRating: 0,
        numSales: 0,
        isPublished: false,
        tags: [],
        sizes: [],
        colors: [],
        ratingDistribution: [],
        reviews: [],
      };

// ✅ Tách component thành 2 overload signatures
function ProductForm(props: { type: "Create"; product?: never; productId?: never }): JSX.Element;
function ProductForm(props: { type: "Update"; product: IProduct; productId: string }): JSX.Element;

function ProductForm({ type, product, productId }: { type: "Create" | "Update"; product?: IProduct; productId?: string }) {
  const router = useRouter();
  const { toast } = useToast();

  // ✅ Conditional form setup dựa trên type
  const form = useForm<IProductInput | IProductUpdate>({
    resolver: (type === "Update" ? zodResolver(ProductUpdateSchema) : zodResolver(ProductInputSchema)) as Resolver<IProductInput | IProductUpdate, IProductInput | IProductUpdate>,
    defaultValues: type === "Update" && product ? (product as IProductUpdate) : (productDefaultValues as IProductInput),
  });

  async function onSubmit(values: IProductInput | IProductUpdate) {
    if (type === "Create") {
      const input = values as IProductInput; // ⬅️ Type narrowing rõ ràng
      const res = await createProduct(input);
      if (!res.success) {
        toast({
          variant: "destructive",
          description: res.message,
        });
      } else {
        toast({
          description: res.message,
        });
        router.push(`/admin/products`);
      }
    }

    if (type === "Update") {
      if (!productId) {
        router.push(`/admin/products`);
        return;
      }
      const res = await updateProduct({
        ...(values as IProductUpdate),
        _id: productId,
      });
      if (!res.success) {
        toast({
          variant: "destructive",
          description: res.message,
        });
      } else {
        router.push(`/admin/products`);
      }
    }
  }

  const images = useWatch({ control: form.control, name: "images" });

  console.log(form.formState.errors);

  return (
    <Form {...form}>
      <form method="post" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex flex-col gap-5 md:flex-row">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter product name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input placeholder="Enter product slug" className="pl-8" {...field} />
                    <button
                      type="button"
                      onClick={() => {
                        const name = form.getValues("name") as string;
                        form.setValue("slug", toSlug(name));
                      }}
                      className="absolute right-2 top-2.5 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Generate
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col gap-5 md:flex-row">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input placeholder="Enter category" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Brand</FormLabel>
                <FormControl>
                  <Input placeholder="Enter product brand" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col gap-5 md:flex-row">
          <FormField
            control={form.control}
            name="listPrice"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>List Price</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Enter product list price" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Net Price</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Enter product price" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="countInStock"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Count In Stock</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Enter product count in stock" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col gap-5 md:flex-row">
          <FormField
            control={form.control}
            name="images"
            render={() => (
              <FormItem className="w-full">
                <FormLabel>Images</FormLabel>
                <Card>
                  <CardContent className="space-y-2 mt-2 min-h-48">
                    <div className="flex flex-wrap gap-2 items-center">
                      {images.map((image: string) => (
                        <Card key={image} className="relative ">
                          <Image src={image} alt="product image" className="w-36 h-36 object-cover object-center rounded-sm" width={100} height={100} />
                          <Button
                            variant={"destructive"}
                            className="absolute top-1 right-1"
                            type="button"
                            size="icon"
                            onClick={() => {
                              form.setValue(
                                "images",
                                images.filter((img) => img !== image)
                              );
                            }}
                          >
                            <Trash />
                          </Button>
                        </Card>
                      ))}
                      <FormControl>
                        <UploadButton
                          endpoint="imageUploader"
                          onClientUploadComplete={(res: { url: string }[]) => {
                            if (res && res.length > 0) {
                              form.setValue("images", [...images, res[0].url]);
                            }
                          }}
                          onUploadError={(error: Error) => {
                            toast({
                              variant: "destructive",
                              description: `ERROR! ${error.message}`,
                            });
                          }}
                        />
                      </FormControl>
                    </div>
                  </CardContent>
                </Card>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Tell us a little bit about yourself" className="resize-none" {...field} />
                </FormControl>
                <FormDescription>
                  You can <span>@mention</span> other users and organizations to link to them.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2">
                <FormControl>
                  <Checkbox checked={field.value as boolean} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="mt-0!">Is Published?</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div>
          <Button type="submit" size="lg" disabled={form.formState.isSubmitting} className="button col-span-2 w-full">
            {form.formState.isSubmitting ? "Submitting..." : `${type} Product `}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default ProductForm;
