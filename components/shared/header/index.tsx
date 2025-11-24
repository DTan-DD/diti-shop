import Image from "next/image";
import Link from "next/link";
import { getAllCategories } from "@/lib/actions/product.actions";
import Menu from "./menu";
import Search from "./search";
import data from "@/lib/data";
import Sidebar from "./sidebar";
import { getSetting } from "@/lib/actions/setting.actions";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import DynamicHeaderWrapper from "./dynamic-header-wrapper";

export default async function Header() {
  const categories = await getAllCategories();
  const { site } = await getSetting();
  const t = await getTranslations();
  const session = await auth();

  return (
    <DynamicHeaderWrapper>
      <div className="px-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center header-button gap-2 font-extrabold text-2xl m-1">
              <Image src={site.logo} width={55} height={55} alt={`${site.name} logo`} />
              {site.name}
            </Link>
          </div>
          <div className="hidden md:block flex-1 max-w-xl">
            <Search />
          </div>
          <Menu forAdmin={session?.user?.role === "Admin"} />
        </div>
        <div className="md:hidden block py-2">
          <Search />
        </div>
      </div>
      <div className="flex items-center px-3 mb-px bg-gray-800">
        <Sidebar categories={categories} />
        <div className="relative group">
          {/* Menu bar */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin px-4 py-1">
            {data.headerMenus.map((menu) => (
              <Link href={menu.href} key={menu.href} className="header-button px-4 py-2 text-sm font-medium rounded-lg hover:bg-gray-200 hover:text-black transition-all duration-200 flex-shrink-0">
                {t("Header." + menu.name)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DynamicHeaderWrapper>
  );
}
