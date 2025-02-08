"use client"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Timer, Zap } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react";

import { io } from "socket.io-client";


export default function Home() {

 

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="container flex flex-col items-center gap-4 pb-8 pt-6 md:py-10">
        <div className="flex max-w-[980px] flex-col items-center gap-2">
          <h1 className="text-center text-3xl font-bold leading-tight tracking-tighter md:text-6xl lg:leading-[1.1]">
            Maintain Perfect Posture
            <br />
            While You Code
          </h1>
          <p className="max-w-[750px] text-center text-lg text-muted-foreground sm:text-xl">
            AI-powered posture detection that helps you stay healthy while you work. Get real-time feedback and insights to improve your sitting habits.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/live-posture">
            <Button size="lg">
              Try Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg">
              View Dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container space-y-6 py-8 dark:bg-transparent md:py-12 lg:py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-6xl">
            Features
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Po-Go combines cutting-edge AI with ergonomic expertise to help you maintain healthy posture habits.
          </p>
        </div>
        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Shield className="h-12 w-12" />
              <div className="space-y-2">
                <h3 className="font-bold">AI-Powered Detection</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time posture analysis using advanced computer vision.
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Timer className="h-12 w-12" />
              <div className="space-y-2">
                <h3 className="font-bold">Smart Alerts</h3>
                <p className="text-sm text-muted-foreground">
                  Timely notifications when you need to adjust your posture.
                </p>
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg border bg-background p-2">
            <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
              <Zap className="h-12 w-12" />
              <div className="space-y-2">
                <h3 className="font-bold">Insights Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Track your progress and view detailed posture analytics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Image Section */}
      <section className="container py-8 md:py-12 lg:py-24">
        <div className="mx-auto max-w-[82rem]">
          <div className="relative h-[550px] overflow-hidden rounded-xl border bg-background">
            <Image
              src="https://emi.parkview.com/media/Image/Dashboard_952_working_desk_1_22.jpg"
              alt="Developer working at desk"
              fill
              className="object-cover object-bottom"
              priority

            />
          </div>
        </div>
      </section>
    </div>
  )
}