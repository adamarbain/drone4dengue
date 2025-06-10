"use client";

import Link from "next/link";
import Image from "next/image";
import { FiBarChart2, FiUsers, FiCamera, FiDatabase, FiAlertCircle, FiSettings } from "react-icons/fi";

const links = [
  { label: "Dashboard", href: "/dashboard", icon: <FiBarChart2 /> },
  { label: "User Management", href: "/user-management", icon: <FiUsers /> },
  { label: "Drone Management", href: "/drone-management", icon: <FiCamera /> },
  { label: "Data Management", href: "/data-management", icon: <FiDatabase /> },
  { label: "Prediction & Alert", href: "/prediction-alert", icon: <FiAlertCircle /> },
  { label: "Reports", href: "/reports", icon: <FiBarChart2 /> },
  { label: "Settings", href: "/settings", icon: <FiSettings /> },
];

export default function AdminSidebar({ current }: { current: string }) {
  return (
    <aside className="w-64 bg-white flex flex-col py-8 px-4 gap-2 border-r border-[#E2C275]">
      <div className="flex items-center gap-3 mb-8 pl-2">
        <Image src="/logo.svg" alt="Logo" width={40} height={40} />
        <span className="font-bold text-xl text-black">Drone4Dengue Admin</span>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-semibold transition-all ${
              current === link.label
                ? "bg-[#A21C1C] text-white shadow"
                : "text-black hover:bg-[#F3EAD8]"
            }`}
          >
            <span className="text-lg">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
} 