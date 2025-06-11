"use client"

import Link from "next/link"
import Image from "next/image"
import { FiBarChart2, FiUsers, FiCamera, FiDatabase, FiAlertCircle, FiSettings, FiHome } from "react-icons/fi"
import { motion } from "framer-motion"

const links = [
  { label: "Dashboard", href: "/dashboard", icon: <FiHome /> },
  { label: "User Management", href: "/user-management", icon: <FiUsers /> },
  { label: "Drone Management", href: "/drone-management", icon: <FiCamera /> },
  { label: "Data Management", href: "/data-management", icon: <FiDatabase /> },
  { label: "Prediction & Alert", href: "/prediction-alert", icon: <FiAlertCircle /> },
  { label: "Reports", href: "/reports", icon: <FiBarChart2 /> },
  { label: "Settings", href: "/settings", icon: <FiSettings /> },
]

export default function AdminSidebar({ current }: { current: string }) {
  return (
    <aside className="w-72 bg-white flex flex-col py-8 px-4 gap-2 border-r border-[#E2C275] shadow-lg">
      <div className="flex items-center gap-3 mb-10 px-4">
        <div className="relative w-10 h-10 bg-[#A21C1C] rounded-lg flex items-center justify-center">
          <Image src="/logo.svg" alt="Logo" width={28} height={28} className="object-contain" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#E2C275] rounded-full"></div>
        </div>
        <span className="font-bold text-xl text-black">Drone4Dengue</span>
      </div>

      <div className="px-2 mb-4">
        <p className="text-xs uppercase tracking-wider text-gray-500 font-medium px-4">Main Menu</p>
      </div>

      <nav className="flex flex-col gap-2 px-2">
        {links.map((link) => {
          const isActive = current === link.label

          return (
            <Link
              key={link.label}
              href={link.href}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 group ${
                isActive ? "bg-[#A21C1C] text-white" : "text-gray-600 hover:bg-[#FFF7E3]"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-[#E2C275] rounded-r-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
              <span className={`text-lg ${isActive ? "text-white" : "text-[#A21C1C] group-hover:text-[#A21C1C]"}`}>
                {link.icon}
              </span>
              <span className={isActive ? "font-semibold" : ""}>{link.label}</span>
              {isActive && <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white"></div>}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto mx-4 mb-6 bg-gradient-to-r from-[#FFF7E3] to-[#E2C275]/30 p-4 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#A21C1C] flex items-center justify-center text-white">
            <FiAlertCircle size={16} />
          </div>
          <p className="font-medium text-sm">Need Help?</p>
        </div>
        <p className="text-xs text-gray-600 mb-3">Contact our support team for assistance</p>
        <button className="w-full py-2 bg-[#A21C1C] text-white text-sm font-medium rounded-lg hover:bg-[#7C1D1D] transition-colors">
          Contact Support
        </button>
      </div>
    </aside>
  )
}
