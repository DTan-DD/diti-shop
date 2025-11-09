import { AlertCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ValidationError {
  productId: string;
  productName: string;
  slug: string;
  requested: number;
  available: number;
}

interface ValidationWarning {
  productId: string;
  productName: string;
  oldQuantity: number;
  newQuantity: number;
}

interface CartValidationDialogProps {
  open: boolean;
  onClose: () => void;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  hasErrors: boolean;
  hasWarnings: boolean;
  onFixCart: () => Promise<void>;
  onRemoveItems: () => void;
}

export default function CartValidationDialog({ open, onClose, errors, warnings, hasErrors, hasWarnings, onFixCart, onRemoveItems }: CartValidationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasErrors && <AlertCircle className="h-5 w-5 text-red-500" />}
            {hasWarnings && !hasErrors && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
            Cart Stock Issue
          </DialogTitle>
          <DialogDescription>{hasErrors ? "Some items in your cart are out of stock" : "Some items have limited stock available"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {/* Errors - Out of stock */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-red-600">Out of Stock</h3>
              {errors.map((error) => (
                <Alert key={error.productId} variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{error.productName}</AlertTitle>
                  <AlertDescription>This item is no longer available. Please remove it from your cart.</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Warnings - Limited stock */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-yellow-600">Limited Stock</h3>
              {warnings.map((warning) => (
                <Alert key={warning.productId} className="border-yellow-500">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <AlertTitle>{warning.productName}</AlertTitle>
                  <AlertDescription>
                    Only {warning.newQuantity} item(s) available. Your cart has {warning.oldQuantity}. We will adjust to the available quantity.
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {hasErrors ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Go Back to Cart
              </Button>
              <Button onClick={onRemoveItems} variant="destructive">
                Remove Out of Stock Items
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={onFixCart}>Adjust Quantities & Continue</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
