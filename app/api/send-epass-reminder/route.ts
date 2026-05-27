import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { format } from "date-fns"
import { sendWhatsAppMessage } from "@/lib/whatsapp"

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(request: NextRequest) {
  try {
    const { truckIds } = await request.json()

    if (!Array.isArray(truckIds) || truckIds.length === 0) {
      return NextResponse.json({ error: "truckIds array is required" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const results: { truckId: string; success: boolean; error?: string }[] = []

    for (const truckId of truckIds) {
      try {
        const { data: truck } = await supabase
          .from("trucks")
          .select("truck_number, epass_expiry_date, owner:owner_id(phone)")
          .eq("id", truckId)
          .single()

        if (!truck?.epass_expiry_date) {
          results.push({ truckId, success: false, error: "No e-pass expiry date" })
          continue
        }

        const ownerArr = truck.owner as { phone: string }[] | null
        const ownerPhone = ownerArr?.[0]?.phone
        if (!ownerPhone) {
          results.push({ truckId, success: false, error: "Owner phone not found" })
          continue
        }

        const days = Math.ceil(
          (new Date(truck.epass_expiry_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        )
        const date = format(new Date(truck.epass_expiry_date), "dd MMM yyyy")
        const dayText =
          days > 0
            ? `${days} din mein`
            : days === 0
              ? "aaj"
              : `${Math.abs(days)} din pehle`

        const message = `⚠️ Alert: Truck ${truck.truck_number} ka e-pass ${dayText} expire ho raha hai (${date}). Jaldi renew karo nahi toh truck rok liya jayega.`

        await sendWhatsAppMessage(ownerPhone, message)

        await supabase.from("epass_reminders").insert({
          truck_id: truckId,
          message_sent: message,
        })

        results.push({ truckId, success: true })
      } catch (err) {
        results.push({
          truckId,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    )
  }
}
