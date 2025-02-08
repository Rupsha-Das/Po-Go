"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { ActivitySquare, Divide } from "lucide-react"
import { useEffect, useState } from "react"
import { CiLogout } from "react-icons/ci";

const navigation = [
  { name: "Home", href: "/" },
  { name: "Live Posture", href: "/live-posture" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Wellbeing", href: "/wellbeing" },
  { name: "Contact", href: "/contact" },
]

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();



  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  const handleLogout = () => {
    window.localStorage.removeItem("po_go_email");
    window.localStorage.removeItem("po_go_name");
    router.push("/");
  }

  useEffect(() => {
    setEmail(window.localStorage.getItem("po_go_email"));
    setName(window.localStorage.getItem("po_go_name"));
  }, [])


  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-36 flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold text-3xl">Po-Go</span>
        </Link>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="hidden md:flex md:items-center md:space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === item.href
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <ModeToggle />
          </div>
        </div>
        {/* if logged in then dont show the login button */}
        <div className="flex flex-row ml-10 items-center justify-between gap-12">
          {name ? <><div className="text-md">Hello, {name}</div>
            <CiLogout className="text-2xl cursor-pointer" title="logout"
              onClick={handleLogout}
            />
          </> :
            email ? <><div className="text-md">Hello, {email}</div> <CiLogout className="text-2xl cursor-pointer" title="logout" onClick={handleLogout}
            />
            </> :
              <><Link href={"/login"}>
                <div
                  className="text-gray-800 ml-10 bg-white font-bold px-5 py-1 rounded-lg cursor-pointer hover:bg-gray-200 transition-all">
                  Log In
                </div>
              </Link>

              </>
          }
        </div>
      </div>
    </nav>
  )
}