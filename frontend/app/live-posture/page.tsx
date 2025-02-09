"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, Camera, Clock, Pause, Play, RefreshCw } from "lucide-react"
import { io, Socket } from "socket.io-client";
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

import { FaChartLine } from "react-icons/fa6";

// import Human_silhouette from "@/components/human_silhouette"
import posture_img_1 from "@/public/guide-to-a-good-posture-1.png"
import posture_img_2 from "@/public/guide-to-a-good-posture-2.png"
import posture_img_3 from "@/public/guide-to-a-good-posture-3.png"
import logo_image from "@/public/logo image.png"

import analyzePosture from "@/components/posture";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"

const weeklyData = [
  { day: "Mon", goodPosture: 75, badPosture: 25 },
  { day: "Tue", goodPosture: 65, badPosture: 35 },
  { day: "Wed", goodPosture: 80, badPosture: 20 },
  { day: "Thu", goodPosture: 70, badPosture: 30 },
  { day: "Fri", goodPosture: 85, badPosture: 15 },
  { day: "Sat", goodPosture: 90, badPosture: 10 },
  { day: "Sun", goodPosture: 78, badPosture: 22 },
]



export default function LivePosture() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [sittingTime, setSittingTime] = useState(0)
  const [badPostureTime, setBadPostureTime] = useState(0)
  const [isCameraConnected, setIsCameraConnected] = useState(false);
  const { toast } = useToast()

  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [postureData, setPostureData] = useState({
    "deviceId": "e7fad02a-55d5-40fc-8030-bbb82045a501",
    "action": "update",
    "trust": 0.5586716051664218,
    "timestamp": "2025-02-08T20:54:45.236492",
    "neckAngle": {
      "value": 0,
      "confidence": 0
    },
    "backCurvature": {
      "value": 0,
      "confidence": 0.5586716051664218
    },
    "armAngleL": {
      "value": 173.17283195051948,
      "confidence": 0.6928661465644836
    },
    "armAngleR": {
      "value": 90.49158771025344,
      "confidence": 0.8526173830032349
    },
    "hipAngle": {
      "value": null,
      "confidence": null
    },
    "kneeAngleL": {
      "value": 0,
      "confidence": 0
    },
    "kneeAngleR": {
      "value": 0,
      "confidence": 0
    },
    "posture": {
      "trunk": "acceptable",
      "neck": "unknown",
      "arm_left": "not recommended",
      "arm_right": "not recommended",
      "hip": "unknown",
      "knee": "unknown",
      "overall": "BAD"
    }
  })

  const [posture_status_message, setPosture_status_message] = useState<{ message: string, subMessages: string[] }>(analyzePosture(postureData));

  useEffect(() => {
    analyzePosture(postureData);
  }, [])

  useEffect(() => {
    if (window.localStorage.getItem("po_go_email")) {
      setEmail(window.localStorage.getItem("po_go_email"));
      setLoading(false)
    } else {
      router.replace("/login");
    }
  }, []);

  const [posture_status, setPosture_status] = useState<string>("Good Posture");



  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setSittingTime((prev) => prev + 1)
        // Simulated bad posture detection (random for demo)
        // if (Math.random() > 0.7) {
        if (posture_status_message.message == "Bad posture") {
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
        // }
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording, toast])

  useEffect(() => {
    if (badPostureTime >= 20) {
      const audio = new Audio("../../public/alert sound.mp3")
      audio.play();
    }
  }, [badPostureTime]);

  interface socketType {
    msg: string;
  }

  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket: Socket = io("https://po-go.onrender.com/");
    setSocket(newSocket);


    type ConnectToProducerResult = {
      msg: string;
    };

    newSocket.on("connect", () => {
      newSocket.emit('register', { type: "consumer", email: email });
      newSocket.on('connect-to-producer-result', (data: ConnectToProducerResult) => {
        console.log(data.msg)
        //use this data to show msg to the user
        if (data.msg == "Connected to Device") {
          setIsCameraConnected(true);
          toast(
            {
              title: "Connected to Camera",
              description: `${data.msg}. If you move to any tab, the camera will be disconnected.`,
            }
          )
        } else {
          toast(
            {
              title: "Unable to connect to Camera",
              description: `${data.msg}. Please try again.`,
              variant: "destructive",
            })
        }
      })
    });

    return () => {
      // console.log("disconnecting");
      newSocket.disconnect();
    }

  }, [])

  const connectToProducer = () => {
    if (socket !== null) {
      socket.emit("connect-to-producer", {});
    }
  }

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
      // startCamera()
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

  const CustomLineChart = ({ data, xKey }: { data: any[], xKey: string }) => {
    console.log("This is chart");
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12 }}
            padding={{ left: 10, right: 10 }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
          />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="goodPosture"
            stroke="hsl(var(--chart-1))"
            name="Good Posture %"
            isAnimationActive={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="badPosture"
            stroke="hsl(var(--chart-2))"
            name="Bad Posture %"
            isAnimationActive={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }
  if (loading) {
    return (
      <div className="flex justify-center items-center mt-60">
        <div className="honeycomb">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div></div>)
  }

  return (
    <div className="container py-8">
      <div className="my-5">
        <Button size={"lg"} disabled={socket == null || isCameraConnected}
          className="" onClick={connectToProducer}>{isCameraConnected ? "Connected" : "Connect to a camera"}</Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Camera Feed */}
        <Card className="p-4">
          <div className="relative aspect-video rounded-lg ">
            {/* <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full rounded-lg object-cover"
            /> */}
            <Tabs defaultValue="weekly">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Posture History</h2>
              </div>
              <TabsContent value="weekly" className="mt-4">
                <CustomLineChart data={weeklyData} xKey="day" />
              </TabsContent>
            </Tabs>
            {!isRecording && (
              <div className="absolute inset-0 flex items-center justify-center bg-background">
                <FaChartLine className="h-12 w-12 text-muted-foreground" />
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
          <Card className="p-6 flex flex-col justify-center items-center">
            {/* <Human_silhouette /> */}
            {/* {true ? <Image src={""} width={ } alt="" /> : <Image src={""} width={ } alt="" />} */}
            {/* <Image src={posture_img_1} height={250} alt="Posture-image" />
             */}
            {isRecording ? <><h2 className={`text-left self-start text-2xl font-bold ${posture_status_message.message == "Posture is good" ? "text-green-500" : "text-red-500"}`}>{posture_status_message.message}</h2>

              <div className="flex justify-between items-center">{posture_status == "Posture is good " ? <Image src={posture_img_1} height={250} alt="Posture-image" /> :
                <Image src={posture_img_2} height={250} alt="Posture-image" />
              }
                <p className="px-6">{posture_status_message.subMessages}</p>
              </div></> : <Image src={logo_image} alt="human sitting on desk-image" />}
          </Card>
        </div>
      </div>
    </div >
  )
}