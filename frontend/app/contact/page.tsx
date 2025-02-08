"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Mail, MessageSquare, Send } from "lucide-react"

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000))

    toast({
      title: "Message Sent",
      description: "Thank you for your message. We'll get back to you soon!",
    })

    setIsSubmitting(false)
    ;(e.target as HTMLFormElement).reset()
  }

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold">Contact Us</h1>
          <p className="mt-2 text-muted-foreground">
            Have questions or feedback? We&apos;d love to hear from you.
          </p>
        </div>

        {/* Contact Options */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <Card className="p-6">
            <Mail className="mb-2 h-6 w-6" />
            <h2 className="text-lg font-semibold">Email Support</h2>
            <p className="text-sm text-muted-foreground">
              For general inquiries and support
            </p>
            <a
              href="mailto:support@po-go.com"
              className="mt-2 inline-block text-sm text-primary hover:underline"
            >
              support@po-go.com
            </a>
          </Card>
          <Card className="p-6">
            <MessageSquare className="mb-2 h-6 w-6" />
            <h2 className="text-lg font-semibold">Live Chat</h2>
            <p className="text-sm text-muted-foreground">
              Chat with our support team
            </p>
            <Button variant="link" className="mt-2 h-auto p-0">
              Start Chat
            </Button>
          </Card>
        </div>

        {/* Contact Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                name="subject"
                placeholder="What's this about?"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Your message..."
                rows={5}
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                "Sending..."
              ) : (
                <>
                  Send Message
                  <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}