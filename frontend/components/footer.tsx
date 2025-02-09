import { ActivitySquare } from "lucide-react"
import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="container  px-40 flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <ActivitySquare className="h-6 w-6" />
          <p className="text-center text-sm leading-loose md:text-left">
            The source code is available on{" "}
            <Link
              href="https://github.com/Rupsha-Das/Po-Go"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              GitHub
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  )
}