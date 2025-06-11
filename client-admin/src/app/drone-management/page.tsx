"use client"

import AdminSidebar from "@/components/AdminSidebar"
import AdminHeader from "@/components/AdminHeader"
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiCamera,
  FiMapPin,
  FiCalendar,
  FiActivity,
  FiSettings,
  FiEye,
  FiChevronRight,
} from "react-icons/fi"
import Image from "next/image"
import { motion } from "framer-motion"
import { useState } from "react"
import type { JSX } from "react"

const drones = [
  { id: "DRN-001", date: "13/05/2022", area: "FSKTM UM", status: "Operational" },
  { id: "DRN-002", date: "22/05/2022", area: "Dewan Tuanku Canselor", status: "Operational" },
  { id: "DRN-003", date: "15/06/2022", area: "Menara Axis, Petaling Jaya", status: "Maintenance" },
  { id: "DRN-004", date: "06/09/2022", area: "One Utama, Damansara Perdana", status: "Maintenance" },
  { id: "DRN-005", date: "25/09/2022", area: "Vista Angkasa", status: "Inactive" },
  { id: "DRN-006", date: "04/10/2022", area: "Pantai Hillpark", status: "Operational" },
  { id: "DRN-007", date: "17/10/2022", area: "Jalan Telawi, Bangsar", status: "Operational" },
]

const statusStyles: Record<string, string> = {
  Operational: "text-green-700 bg-green-100 border-green-200",
  Maintenance: "text-yellow-800 bg-yellow-100 border-yellow-200",
  Inactive: "text-red-700 bg-red-100 border-red-200",
}

const statusIcons: Record<string, JSX.Element> = {
  Operational: <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>,
  Maintenance: <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></span>,
  Inactive: <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2"></span>,
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

export default function DroneManagementPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDrone, setSelectedDrone] = useState("DRN-001")

  const filteredDrones = drones.filter(
    (drone) =>
      drone.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drone.area.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-[#FFF7E3] flex flex-row  border-[8px] border-[#E2C275] overflow-hidden">
      <AdminSidebar current="Drone Management" />
      <main className="flex-1 flex flex-col">
        <AdminHeader />
        {/* Content */}
        <motion.section className="px-10 py-8" variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-1">Drone Management</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#A21C1C]"></div>
              <div className="text-lg text-gray-600">Manage all aspects of the drones and images captured by drone</div>
            </div>
          </motion.div>

          {/* Drone Stats */}
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Total Drones", value: drones.length, icon: <FiCamera />, color: "bg-blue-500" },
              {
                label: "Operational",
                value: drones.filter((d) => d.status === "Operational").length,
                icon: <FiActivity />,
                color: "bg-green-500",
              },
              {
                label: "Maintenance",
                value: drones.filter((d) => d.status === "Maintenance").length,
                icon: <FiSettings />,
                color: "bg-yellow-500",
              },
              { label: "Coverage Areas", value: "12", icon: <FiMapPin />, color: "bg-purple-500" },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                className="bg-white rounded-xl shadow-md overflow-hidden border border-[#E2C275]/30"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 ${stat.color} rounded-lg text-white`}>{stat.icon}</div>
                  </div>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <div className="text-gray-500">{stat.label}</div>
                </div>
                <div className={`h-1 ${stat.color}`}></div>
              </motion.div>
            ))}
          </motion.div>

          {/* Drone List Table */}
          <motion.div variants={item} className="mb-10">
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-[#E2C275]/30">
              <div className="bg-[#A21C1C] px-6 py-4 flex items-center gap-4">
                <div className="font-bold text-lg text-white">Drone Fleet</div>
                <div className="flex-1" />
                <div className="relative">
                  <div className="flex items-center bg-white/10 rounded-lg">
                    <FiSearch className="ml-3 text-white" />
                    <input
                      type="text"
                      placeholder="Search drones..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-transparent border-none text-white placeholder-white/70 px-3 py-2 w-64 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-black font-semibold text-base border-b border-gray-200 bg-[#F3EAD8]">
                      <th className="py-4 px-6">Drone ID</th>
                      <th className="py-4 px-6">Registration Date</th>
                      <th className="py-4 px-6">Operational Area</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrones.map((drone, idx) => (
                      <motion.tr
                        key={drone.id}
                        className={`border-b border-gray-100 last:border-0 hover:bg-[#FFF7E3]/50 transition-colors cursor-pointer ${idx % 2 === 0 ? "bg-white" : "bg-[#F9F6F2]"}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => setSelectedDrone(drone.id)}
                      >
                        <td className="py-4 px-6 font-medium flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#A21C1C]/10 rounded-lg flex items-center justify-center">
                            <FiCamera className="text-[#A21C1C]" />
                          </div>
                          {drone.id}
                        </td>
                        <td className="py-4 px-6 flex items-center gap-2">
                          <FiCalendar className="text-[#A21C1C]" size={16} />
                          {drone.date}
                        </td>
                        <td className="py-4 px-6 flex items-center gap-2">
                          <FiMapPin className="text-[#A21C1C]" size={16} />
                          {drone.area}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center w-fit ${statusStyles[drone.status]}`}
                          >
                            {statusIcons[drone.status]}
                            {drone.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2">
                            <button className="p-2 rounded-lg hover:bg-[#FFF7E3] text-[#A21C1C] transition-colors">
                              <FiEye size={18} />
                            </button>
                            <button className="p-2 rounded-lg hover:bg-[#FFF7E3] text-[#A21C1C] transition-colors">
                              <FiEdit2 size={18} />
                            </button>
                            <button className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>

          {/* Drone Images */}
          <motion.div variants={item}>
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-[#E2C275]/30">
              <div className="px-6 py-4 bg-[#F3EAD8] border-b border-[#E2C275]/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <FiCamera className="text-[#A21C1C]" />
                    Drone Images
                  </h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedDrone}
                      onChange={(e) => setSelectedDrone(e.target.value)}
                      className="px-4 py-2 bg-[#A21C1C] text-white rounded-lg font-medium text-sm"
                    >
                      {drones.map((drone) => (
                        <option key={drone.id} value={drone.id}>
                          {drone.id} - {drone.area}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {droneImages.map((src, idx) => (
                    <motion.div
                      key={idx}
                      className="group relative rounded-xl overflow-hidden shadow-md bg-gray-100"
                      whileHover={{ y: -5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="relative h-48">
                        <Image
                          src={src || "/placeholder.svg"}
                          alt={`Drone capture ${idx + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium">
                          {new Date().toLocaleDateString()}
                        </div>
                        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
                          Capture #{idx + 1}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="bg-white/90 backdrop-blur-sm p-3 rounded-full hover:bg-white transition-colors">
                            <FiEye className="text-[#A21C1C]" size={20} />
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">Image {idx + 1}</div>
                            <div className="text-xs text-gray-500">Resolution: 4K</div>
                          </div>
                          <button className="text-[#A21C1C] hover:bg-[#FFF7E3] p-2 rounded-lg transition-colors">
                            <FiChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex justify-center mt-6">
                  <button className="flex items-center gap-2 px-6 py-3 bg-[#A21C1C] text-white rounded-lg font-medium hover:bg-[#7C1D1D] transition-colors">
                    Load More Images
                    <FiChevronRight />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>
      </main>
    </div>
  )
}
