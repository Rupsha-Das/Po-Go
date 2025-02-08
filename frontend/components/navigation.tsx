"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { ActivitySquare } from "lucide-react"
import Image from "next/image"

import logo_image from "@/public/logo image2.png"

const navigation = [
  { name: "Home", href: "/" },
  { name: "Live Posture", href: "/live-posture" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Wellbeing", href: "/wellbeing" },
  { name: "Contact", href: "/contact" },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <ActivitySquare className="h-6 w-6" />
          <span>Po</span>
          <Image src={logo_image} width={27} className="dark:invert mx-1" alt="" />
          <span>Go</span>
        </Link>
        <nav className="flex flex-1 items-center justify-center space-x-6">
          {navigation.map((item) => (
            <Link
              key={item.href}
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
        </nav>
        <div className="flex items-center space-x-4">
          <ModeToggle />
          <Button>Get Started</Button>
        </div>
      </div>
    </header>
  )
}