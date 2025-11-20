import CartButton from "./cart-button";
import UserButton from "./user-button";
import ThemeSwitcher from "./theme-switcher";
import LanguageSwitcher from "./language-switcher";
import MenuClient from "./menu-client";

interface MenuProps {
  forAdmin?: boolean;
}

export default async function Menu({ forAdmin = false }: MenuProps) {
  // Render các Server Components
  const cartButton = <CartButton />;
  const userButton = <UserButton />;
  const themeSwitcher = <ThemeSwitcher />;
  const languageSwitcher = <LanguageSwitcher />;

  return <MenuClient forAdmin={forAdmin} cartButton={cartButton} userButton={userButton} themeSwitcher={themeSwitcher} languageSwitcher={languageSwitcher} />;
}
