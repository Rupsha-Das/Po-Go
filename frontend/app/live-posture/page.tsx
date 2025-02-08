"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, Camera, Clock, Pause, Play, RefreshCw } from "lucide-react"

export default function LivePosture() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [sittingTime, setSittingTime] = useState(0)
  const [badPostureTime, setBadPostureTime] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setSittingTime((prev) => prev + 1)
        // Simulated bad posture detection (random for demo)
        if (Math.random() > 0.7) {
          setBadPostureTime((prev) => {
            const newTime = prev + 1
            if (newTime >= 20) {
              toast({
                title: "Bad Posture Alert!",
                description: "You've been in bad posture for too long. Please adjust your position.",
                variant: "destructive",
              })
            }
            return newTime
          })
        }
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording, toast])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const toggleRecording = () => {
    if (!isRecording) {
      startCamera()
    }
    setIsRecording(!isRecording)
  }

  const resetSession = () => {
    setSittingTime(0)
    setBadPostureTime(0)
    setIsRecording(false)
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="container py-8">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Camera Feed */}
        <Card className="p-4">
          <div className="relative aspect-video rounded-lg bg-muted">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full rounded-lg object-cover"
            />
            {!isRecording && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Camera className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="mt-4 flex justify-center gap-4">
            <Button onClick={toggleRecording} size="lg">
              {isRecording ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start
                </>
              )}
            </Button>
            <Button onClick={resetSession} variant="outline" size="lg">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </Card>

        {/* Stats */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-2xl font-semibold">Session Time</h3>
                <p className="text-sm text-muted-foreground">
                  Total time in current session
                </p>
              </div>
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="mt-4">
              <p className="text-4xl font-bold">{formatTime(sittingTime)}</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-semibold">Posture Status</h3>
                {badPostureTime >= 20 && (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Time in bad posture: {formatTime(badPostureTime)}
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <Progress value={(badPostureTime / 20) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Alert at 20 seconds of bad posture
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}