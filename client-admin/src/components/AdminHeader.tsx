"use client";

import Image from "next/image";
import { FiSearch } from "react-icons/fi";

export default function AdminHeader() {
  return (
    <header className="flex items-center justify-between px-10 py-6 bg-white border-b border-[#E2C275]">
      <div />
      <div className="flex items-center gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search"
            className="rounded-lg bg-[#7C1D1D] text-white placeholder-white px-4 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-[#E2C275]"
          />
          <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-white text-lg" />
        </div>
        <button className="bg-[#A21C1C] text-white px-6 py-2 rounded-lg font-bold text-base hover:bg-[#7C1D1D]">LOGOUT</button>
        <button className="bg-white border-2 border-[#A21C1C] rounded-full p-2 text-[#A21C1C] hover:bg-[#F3EAD8]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        </button>
        <Image
          src="/images/profile.jpg"
          alt="Profile"
          width={40}
          height={40}
          className="rounded-full border-2 border-[#E2C275] object-cover"
        />
      </div>
    </header>
  );
} 