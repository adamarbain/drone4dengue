"use client"

import type React from "react"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { User, Lock, Eye, EyeOff, AlertCircle } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { motion } from "framer-motion"
import Image from "next/image"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()
  const { loginAdmin, isLoading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      await loginAdmin(email, password)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err?.response?.data?.error || "Login failed. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-secondary-blue to-accent-blue relative overflow-hidden flex items-center justify-center">
      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-light-bg rounded-full transform translate-y-1/2 -translate-x-1/4 opacity-80"></div>
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-accent-blue rounded-full transform translate-x-1/3 -translate-y-1/4 opacity-60"></div>
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-light-bg rounded-full transform -translate-y-1/2 opacity-80"></div>

      {/* Animated mosquito silhouettes */}
      <motion.div
        className="absolute top-20 left-1/4 w-20 h-20 opacity-60"
        animate={{
          y: [0, 10, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 4,
          ease: "easeInOut",
        }}
      >
        <Image
          src="/images/mosquito-icon.png"
          alt="Mosquito silhouette"
          width={80}
          height={80}
          className="w-full h-full object-contain"
          priority={false}
        />
      </motion.div>

      <motion.div
        className="absolute bottom-40 right-1/4 w-16 h-16 opacity-60"
        animate={{
          y: [0, -15, 0],
          rotate: [0, -8, 0],
        }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 5,
          ease: "easeInOut",
        }}
      >
        <Image
          src="/images/mosquito-icon.png"
          alt="Mosquito silhouette"
          width={60}
          height={60}
          className="w-full h-full object-contain"
          priority={false}
        />
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 w-full max-w-md">
        {/* Title */}
        <motion.div
          className="absolute top-8 left-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-white text-3xl font-bold">
            Drone4Dengue
            <br />
            <span className="text-light-bg">Admin</span>
          </h1>
        </motion.div>

        {/* Login form container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full"
        >
          <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl overflow-hidden rounded-2xl">
            <CardContent className="space-y-6 p-8">
              {/* Mosquito icon */}
              <div className="flex justify-center mb-6">
                <motion.div
                  className="w-24 h-24 rounded-lg flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Image
                    src="/images/drone4dengue-logo.png"
                    alt="Drone4Dengue Logo"
                    width={80}
                    height={80}
                    className="object-contain"
                  />
                </motion.div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-white rounded-lg p-3 flex items-center gap-2"
                >
                  <AlertCircle className="h-5 w-5 text-red-300" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}

              {/* Login form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/80 text-sm">
                    Email Address
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-bg w-5 h-5" />
                    <Input
                      id="email"
                      type="email"
                      placeholder=""
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/50 focus:border-accent-blue focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="password" className="text-white/80 text-sm">
                      Password
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-white hover:text-gray-200 transition-colors text-sm"
                    >
                      Forgot Password ?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-bg w-5 h-5" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder=""
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 pr-12 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white focus:border-accent-blue focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-white to-white text-primary-dark font-semibold rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all shadow-lg disabled:opacity-70"
                  >
                    {isLoading ? "LOGGING IN..." : "LOGIN"}
                  </Button>
                </motion.div>
              </form>

              {/* Sign up link */}
              <div className="text-center mt-6">
                <span className="text-white/70 text-sm">{"Don't have an account? "}</span>
                <Link
                  href="/signup"
                  className="text-white font-semibold hover:text-gray-200 transition-colors text-sm"
                >
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="absolute bottom-4 text-white/50 text-xs text-center"
        >
          © 2025 Drone4Dengue. All rights reserved.
        </motion.div>
      </div>
    </div>
  )
}
