"use client"

import AdminSidebar from "@/components/AdminSidebar"
import AdminHeader from "@/components/AdminHeader"
import Image from "next/image"
import {
  FiArrowUp,
  FiArrowDown,
  FiPlus,
  FiUpload,
  FiEye,
  FiDownload,
  FiActivity,
  FiUsers,
  FiCamera,
} from "react-icons/fi"
import { motion } from "framer-motion"

const stats = [
  {
    label: "Risk Prediction Today",
    value: 8,
    icon: <FiActivity className="text-[#A21C1C]" />,
    change: 2,
    isIncrease: true,
  },
  {
    label: "Drone Insights Uploaded",
    value: 7,
    icon: <FiCamera className="text-[#A21C1C]" />,
    change: 3,
    isIncrease: true,
  },
  {
    label: "Active Users",
    value: 20,
    icon: <FiUsers className="text-[#A21C1C]" />,
    change: 5,
    isIncrease: false,
  },
]

const predictions = [
  { area: "Kuala Lumpur", date: "13/05/2022", status: "Low" },
  { area: "Bangsar", date: "22/05/2022", status: "Low" },
  { area: "Universiti Malaya", date: "15/06/2022", status: "Medium" },
  { area: "Petaling Jaya", date: "06/09/2022", status: "Medium" },
  { area: "Vista Angkasa", date: "25/09/2022", status: "High" },
  { area: "Damansara Perdana", date: "04/10/2022", status: "High" },
]

const statusColors: Record<string, string> = {
  Low: "bg-green-100 text-green-700 border-green-200",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  High: "bg-red-100 text-red-700 border-red-200",
}

const droneImages = ["/images/drone1.jpg", "/images/drone2.jpg", "/images/drone3.jpg"]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row border-[8px] border-[#E2C275] overflow-hidden">
      <AdminSidebar current="Dashboard" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />

        {/* Welcome & Stats */}
        <motion.section className="px-10 py-8" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-1">Welcome Back, Alex</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#A21C1C]"></div>
              <div className="text-lg text-gray-600">Organisation: University Malaya</div>
            </div>
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                className="bg-white rounded-xl shadow-md overflow-hidden border border-[#E2C275]/30"
                whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(226, 194, 117, 0.2)" }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-[#FFF7E3] rounded-lg">{stat.icon}</div>
                    <div
                      className={`flex items-center gap-1 text-sm ${stat.isIncrease ? "text-green-600" : "text-red-600"}`}
                    >
                      {stat.isIncrease ? <FiArrowUp size={14} /> : <FiArrowDown size={14} />}
                      <span>{stat.change} from last week</span>
                    </div>
                  </div>
                  <div className="text-4xl font-bold mb-1">{stat.value}</div>
                  <div className="text-gray-500">{stat.label}</div>
                </div>
                <div className={`h-1 ${idx === 0 ? "bg-red-500" : idx === 1 ? "bg-yellow-500" : "bg-green-500"}`}></div>
              </motion.div>
            ))}
          </motion.div>

          {/* Quick Action */}
          <motion.div variants={item} className="mb-10">
            <div className="font-bold text-xl mb-4">Quick Action</div>
            <div className="flex gap-4">
              <button className="bg-[#A21C1C] text-white px-6 py-3 rounded-lg font-bold text-base hover:bg-[#7C1D1D] transition-all flex items-center gap-2 shadow-md hover:shadow-lg">
                <FiPlus />
                New Risk Prediction
              </button>
              <button className="bg-white text-[#A21C1C] border border-[#A21C1C] px-6 py-3 rounded-lg font-bold text-base hover:bg-[#FFF7E3] transition-all flex items-center gap-2">
                <FiUpload />
                Upload New Drone Images
              </button>
            </div>
          </motion.div>

          {/* Recent Predictions Table */}
          <motion.div variants={item} className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <div className="font-bold text-xl">Recent Predictions</div>
              <button className="text-[#A21C1C] hover:underline text-sm font-medium flex items-center gap-1">
                View all <FiArrowUp className="rotate-45" size={14} />
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl shadow-md">
              <table className="min-w-full bg-white rounded-xl overflow-hidden">
                <thead>
                  <tr className="text-left text-black font-semibold text-base bg-[#F3EAD8]">
                    <th className="py-4 px-6">Area</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((row, idx) => (
                    <tr
                      key={row.area + row.date}
                      className={`border-b border-gray-100 last:border-0 hover:bg-[#FFF7E3]/50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-[#F9F6F2]"}`}
                    >
                      <td className="py-4 px-6 font-medium text-black">{row.area}</td>
                      <td className="py-4 px-6 text-gray-600">{row.date}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold border ${statusColors[row.status]}`}
                        >
                          <span
                            className={`inline-block w-2 h-2 rounded-full mr-1.5 ${row.status === "Low" ? "bg-green-500" : row.status === "Medium" ? "bg-yellow-500" : "bg-red-500"}`}
                          ></span>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <button className="p-2 rounded-lg hover:bg-[#FFF7E3] text-[#A21C1C]">
                            <FiEye size={18} />
                          </button>
                          <button className="p-2 rounded-lg hover:bg-[#FFF7E3] text-[#A21C1C]">
                            <FiDownload size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Recent Drone Images */}
          <motion.div variants={item}>
            <div className="font-bold text-xl mb-4">Recent Drone Images</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {droneImages.map((src, idx) => (
                <motion.div
                  key={idx}
                  className="rounded-xl overflow-hidden shadow-md bg-white p-3 border border-[#E2C275]/30"
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="relative h-48 rounded-lg overflow-hidden mb-3">
                    <Image src={src || "/placeholder.svg"} alt={`Drone ${idx + 1}`} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
                      Area {idx + 1}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">Drone Capture #{idx + 1}</div>
                    <button className="text-[#A21C1C] hover:bg-[#FFF7E3] p-1.5 rounded-lg transition-colors">
                      <FiEye size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.section>
      </main>
    </div>
  )
}
