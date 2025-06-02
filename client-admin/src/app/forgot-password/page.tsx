"use client"

import type React from "react"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, ArrowLeft, CheckCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate password reset request
    setTimeout(() => {
      setIsLoading(false)
      setIsSubmitted(true)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-700 relative overflow-hidden">
      {/* Decorative curved shapes */}
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-100 rounded-full transform translate-y-1/2 -translate-x-1/4"></div>
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-red-600 rounded-full transform translate-x-1/3 -translate-y-1/4 opacity-60"></div>
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-yellow-200 rounded-full transform -translate-y-1/2 opacity-80"></div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* Title */}
        <div className="absolute top-8 left-8">
          <h1 className="text-white text-3xl font-bold">
            Drone4Dengue
            <br />
            Admin
          </h1>
        </div>

        {/* Back button */}
        <div className="absolute top-8 right-8">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:text-red-200 hover:bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </Link>
        </div>

        {/* Forgot password form container */}
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-red-300">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-xl">Reset Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isSubmitted ? (
              <>
                <p className="text-white/80 text-sm text-center">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="sr-only">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-300 w-5 h-5" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="EMAIL ADDRESS"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-transparent border-2 border-red-300 rounded-md text-white placeholder-red-300 focus:border-red-200 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-white text-red-800 font-semibold rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? "SENDING..." : "SEND RESET LINK"}
                  </Button>
                </form>
              </>
            ) : (
              <Alert className="bg-green-100 border-green-300 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Password reset link has been sent to {email}. Please check your email and follow the instructions.
                </AlertDescription>
              </Alert>
            )}

            <div className="text-center">
              <Link href="/" className="text-white hover:text-red-200 transition-colors text-sm">
                Remember your password? Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
