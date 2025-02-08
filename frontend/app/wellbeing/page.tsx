import { Card } from "@/components/ui/card"
import { Dumbbell, Monitor, ChevronRight, Brain, Coffee } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const articles = [
  {
    title: "Ergonomic Desk Setup Guide",
    description: "Learn how to set up your workspace for optimal posture and comfort.",
    icon: Monitor,
    href: "#",
    image: "https://cdn.thewirecutter.com/wp-content/media/2023/10/egonomicworkspace-2048px-5953-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp"
  },
  {
    title: "Quick Desk Exercises",
    description: "Simple exercises you can do at your desk to prevent stiffness.",
    icon: Dumbbell,
    href: "#",
    image: "https://newworldbusinesscentre.co.uk/wp-content/uploads/stretch-2.jpg"
  },
  {
    title: "Mindful Work Habits",
    description: "Develop better work habits for improved productivity and health.",
    icon: Brain,
    href: "#",
    image: "https://blogimage.vantagefit.io/vfitimages/2023/10/A-girl-practicing-mindfulness-exercise.png"
  },
  {
    title: "Break Time Routines",
    description: "Make the most of your breaks with these healthy routines.",
    icon: Coffee,
    href: "#",
    image: "https://cdn.prod.website-files.com/647888ca92d03e3fca3f1ea0/647888ca92d03e3fca3f2376_shutterstock_792140977-p-1080.jpeg"
  }
]

export default function Wellbeing() {
  return (
    <div className="container py-8">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold md:text-6xl">Wellbeing Resources</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Expert advice and guidance for maintaining good posture and overall wellbeing
        </p>
      </div>

      {/* Articles Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {articles.map((article) => (
          <Link key={article.title} href={article.href}>
            <Card className="group overflow-hidden">
              <div className="relative h-48">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <article.icon className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold">{article.title}</h2>
                </div>
                <p className="text-muted-foreground">{article.description}</p>
                <div className="mt-4 flex items-center text-sm font-medium text-primary">
                  Read More
                  <ChevronRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Tips Section */}
      <Card className="mt-12 p-8">
        <h2 className="text-2xl font-bold">Quick Tips for Better Posture</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-semibold">Monitor Position</h3>
            <p className="text-muted-foreground">
              Position your monitor at arm&apos;s length and ensure the top of the screen is at or slightly below eye level.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Chair Height</h3>
            <p className="text-muted-foreground">
              Adjust your chair height so your feet rest flat on the floor and your knees are level with your hips.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Keyboard and Mouse</h3>
            <p className="text-muted-foreground">
              Keep your keyboard and mouse at elbow height. Your upper arms should be relaxed at your sides.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Regular Breaks</h3>
            <p className="text-muted-foreground">
              Take a short break every 30 minutes to stand up, stretch, and move around.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}