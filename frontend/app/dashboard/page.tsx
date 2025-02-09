"use client"

import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"


// Sample data - in a real app, this would come from your backend
const weeklyData = [
  { day: "Mon", goodPosture: 75, badPosture: 25 },
  { day: "Tue", goodPosture: 65, badPosture: 35 },
  { day: "Wed", goodPosture: 80, badPosture: 20 },
  { day: "Thu", goodPosture: 70, badPosture: 30 },
  { day: "Fri", goodPosture: 85, badPosture: 15 },
  { day: "Sat", goodPosture: 90, badPosture: 10 },
  { day: "Sun", goodPosture: 78, badPosture: 22 },
]

const monthlyData = [
  { week: "Week 1", goodPosture: 78, badPosture: 22 },
  { week: "Week 2", goodPosture: 82, badPosture: 18 },
  { week: "Week 3", goodPosture: 85, badPosture: 15 },
  { week: "Week 4", goodPosture: 88, badPosture: 12 },
]

const pieData = [
  { name: "Good Posture", value: 75 },
  { name: "Bad Posture", value: 25 },
]

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"]

const CustomLineChart = ({ data, xKey }: { data: any[], xKey: string }) => (
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
        strokeWidth={2}
      />
      <Line
        type="monotone"
        dataKey="badPosture"
        stroke="hsl(var(--chart-2))"
        name="Bad Posture %"
        strokeWidth={2}
      />
    </LineChart>
  </ResponsiveContainer>
)

export default function Dashboard() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (window.localStorage.getItem("po_go_email")) {
      setEmail(window.localStorage.getItem("po_go_email"));
      setLoading(false)
    } else {
      router.replace("/login");
    }
  }, []);

  if (loading) {
    return (
      <div className="honeycomb">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>)
  }

  return (
    <div className="container py-8">
      <div className="grid gap-6">
        {/* Summary Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-6">
            <h3 className="font-semibold">Today&apos;s Score</h3>
            <p className="mt-2 text-3xl font-bold">85%</p>
            <p className="text-sm text-muted-foreground">Good posture time</p>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold">Weekly Average</h3>
            <p className="mt-2 text-3xl font-bold">77%</p>
            <p className="text-sm text-muted-foreground">Good posture time</p>
          </Card>
          <Card className="p-6 sm:col-span-2 lg:col-span-1">
            <h3 className="font-semibold">Monthly Progress</h3>
            <p className="mt-2 text-3xl font-bold">+12%</p>
            <p className="text-sm text-muted-foreground">Improvement</p>
          </Card>
         
        </div>

        {/* Charts */}
        <Card className="p-6">
          <Tabs defaultValue="weekly">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Posture History</h2>
              <TabsList>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="weekly" className="mt-4">
              <CustomLineChart data={weeklyData} xKey="day" />
            </TabsContent>

            <TabsContent value="monthly" className="mt-4">
              <CustomLineChart data={monthlyData} xKey="week" />
            </TabsContent>
          </Tabs>
        </Card>

        {/* Distribution Chart */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold">Posture Distribution</h2>
          <div className="mt-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-center gap-8">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS[index] }}
                />
                <span className="text-sm">
                  {entry.name} ({entry.value}%)
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}