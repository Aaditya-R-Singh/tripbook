"use server"

import { createClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getAdmin() {
  return createClient(supabaseUrl, serviceRoleKey)
}

function insertOwner(
  admin: ReturnType<typeof getAdmin>,
  data: {
    id: string
    name: string
    phone: string
    business_name: string | null
    city: string | null
  },
) {
  return admin.from("owners").insert({
    id: data.id,
    name: data.name,
    phone: data.phone,
    business_name: data.business_name,
    city: data.city,
  })
}

export async function createOwner(_prevState: unknown, formData: FormData) {
  try {
    const name = formData.get("name") as string
    const businessName = formData.get("businessName") as string
    const city = formData.get("city") as string
    const userId = formData.get("userId") as string

    if (!name?.trim()) return { error: "अपना नाम डालें" }
    if (!userId) return { error: "उपयोगकर्ता नहीं मिला" }

    const admin = getAdmin()

    const { data: { user }, error: userError } = await admin.auth.admin.getUserById(userId)
    if (userError || !user?.email) return { error: "उपयोगकर्ता नहीं मिला" }

    const phone = user.email.replace("@tripbook.app", "")

    const { error } = await insertOwner(admin, {
      id: user.id,
      name: name.trim(),
      phone,
      business_name: businessName?.trim() || null,
      city: city?.trim() || null,
    })

    if (error) {
      if (error.message?.includes("city")) {
        const { error: retryError } = await admin.from("owners").insert({
          id: user.id,
          name: name.trim(),
          phone,
          business_name: businessName?.trim() || null,
        })
        if (retryError) return { error: retryError.message }
      } else {
        return { error: error.message }
      }
    }

    const { error: metadataError } = await admin.auth.admin.updateUserById(
      user.id,
      { user_metadata: { phone } },
    )

    if (metadataError) return { error: metadataError.message }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Kuch gadbad hui, dobara try karo" }
  }

  redirect("/dashboard")
}

export async function register(_prevState: unknown, formData: FormData) {
  try {
    const phone = formData.get("phone") as string
    const password = formData.get("password") as string
    const name = formData.get("name") as string
    const businessName = formData.get("businessName") as string

    if (!phone?.trim() || phone.length !== 10) {
      return { error: "सही फ़ोन नंबर डालें (10 अंक)" }
    }
    if (!password || password.length < 6) {
      return { error: "कम से कम 6 अंक का पासवर्ड डालें" }
    }
    if (!name?.trim()) {
      return { error: "अपना नाम डालें" }
    }

    const city = formData.get("city") as string
    const email = `${phone}@tripbook.app`
    const admin = getAdmin()

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { phone },
    })

    if (authError) {
      if (authError.message.includes("already registered")) {
        return { error: "यह फ़ोन नंबर पहले से पंजीकृत है — लॉगिन करें" }
      }
      return { error: authError.message }
    }

    const { error: ownerError } = await insertOwner(admin, {
      id: authData.user.id,
      name: name.trim(),
      phone,
      business_name: businessName?.trim() || null,
      city: city?.trim() || null,
    })

    if (ownerError) {
      if (ownerError.message?.includes("city")) {
        const { error: retryError } = await admin.from("owners").insert({
          id: authData.user.id,
          name: name.trim(),
          phone,
          business_name: businessName?.trim() || null,
        })
        if (retryError) return { error: retryError.message }
      } else {
        return { error: ownerError.message }
      }
    }

    return { success: true, email, password }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Kuch gadbad hui, dobara try karo" }
  }
}
