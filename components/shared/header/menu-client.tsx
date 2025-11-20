"use client";

import { useState } from "react";
import { EllipsisVertical } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTranslations } from "next-intl";

interface MenuClientProps {
  forAdmin?: boolean;
  cartButton: React.ReactNode;
  userButton: React.ReactNode;
  themeSwitcher: React.ReactNode;
  languageSwitcher: React.ReactNode;
}

export default function MenuClient({ forAdmin = false, cartButton, userButton, themeSwitcher, languageSwitcher }: MenuClientProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Desktop - giữ nguyên */}
      <div className="hidden md:flex items-center gap-2">
        {themeSwitcher}
        {languageSwitcher}
        {userButton}
        {!forAdmin && cartButton}
      </div>

      {/* Mobile - Controlled Sheet */}
      <div className="flex md:hidden items-center gap-2">
        {!forAdmin && cartButton}

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger className="header-button">
            <EllipsisVertical />
          </SheetTrigger>
          <SheetContent side="right" className="w-[250px]">
            <SheetHeader>
              <SheetTitle>{t("Header.Settings")}</SheetTitle>
              <SheetDescription className="sr-only">Settings menu</SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-3 mt-6">
              <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                <span className="font-medium">{t("Header.Theme")}</span>
                {themeSwitcher}
              </div>

              {/* Click anywhere để đóng Sheet */}
              <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg cursor-pointer" onClick={handleClose}>
                <span className="font-medium">{t("Header.User")}</span>
                {userButton}
              </div>

              <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                <span className="font-medium">{t("Header.Language")}</span>
                {languageSwitcher}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
