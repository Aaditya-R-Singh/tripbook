import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendWhatsAppMessage } from "@/lib/whatsapp"

const TRUCK_REGEX = /[A-Za-z]{2}\s?\d{1,2}\s?[A-Za-z]{1,2}\s?\d{1,4}/

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse("Forbidden", { status: 403 })
}

async function ensureOwner(supabase: ReturnType<typeof createAdminClient>, phone: string) {
  const { data: existing } = await supabase
    .from("owners")
    .select("id")
    .eq("phone", phone)
    .maybeSingle()

  if (existing) return existing

  const { data: created } = await supabase
    .from("owners")
    .insert({ name: "", phone, business_name: null })
    .select("id")
    .maybeSingle()

  return created
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const messageEntry = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]

    if (!messageEntry) {
      return NextResponse.json({ status: "ok" })
    }

    const from: string = messageEntry.from
    const text: string = (messageEntry.text?.body || "").trim()
    const command = text.toUpperCase()

    const supabase = createAdminClient()

    if (command === "START" || command === "SHURU") {
      await ensureOwner(supabase, from)

      await sendWhatsAppMessage(
        from,
        "TripBook mein swagat hai! Apna naam aur truck number bhejo. Example: Ram, MH31AB1234",
      )
      return NextResponse.json({ status: "ok" })
    }

    if (command === "PAHUNCHA" || command === "REACHED" || command === "DONE") {
      const owner = await ensureOwner(supabase, from)

      if (!owner) {
        await sendWhatsAppMessage(from, "Pehle 'START' bhejo.")
        return NextResponse.json({ status: "ok" })
      }

      const { data: latestTrip } = await supabase
        .from("trips")
        .select("id")
        .eq("owner_id", owner.id)
        .eq("status", "active")
        .order("trip_start_time", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestTrip) {
        await supabase
          .from("trips")
          .update({
            status: "completed",
            trip_end_time: new Date().toISOString(),
          })
          .eq("id", latestTrip.id)
      }

      const today = new Date().toISOString().slice(0, 10)
      const { count } = await supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", owner.id)
        .gte("created_at", today)

      await sendWhatsAppMessage(
        from,
        `Trip complete! Aaj ki total trips: ${count ?? 0}`,
      )
      return NextResponse.json({ status: "ok" })
    }

    if (command === "HISAAB" || command === "REPORT") {
      const owner = await ensureOwner(supabase, from)

      if (!owner) {
        await sendWhatsAppMessage(from, "Pehle 'START' bhejo.")
        return NextResponse.json({ status: "ok" })
      }

      const today = new Date().toISOString().slice(0, 10)
      const { data: trips, count } = await supabase
        .from("trips")
        .select("amount, payment_status", { count: "exact" })
        .eq("owner_id", owner.id)
        .gte("created_at", today)

      const rows: { amount: number | null; payment_status: string }[] = trips ?? []
      const totalAmount = rows.reduce((s, t) => s + (t.amount ?? 0), 0)
      const pendingTrips = rows.filter((t) => t.payment_status === "pending").length
      const pendingAmount = rows
        .filter((t) => t.payment_status === "pending")
        .reduce((s, t) => s + (t.amount ?? 0), 0)

      await sendWhatsAppMessage(
        from,
        `Aaj ka hisaab:\nTotal trips: ${count ?? 0}\nTotal amount: Rs. ${totalAmount}\nPending payments: ${pendingTrips} trips (Rs. ${pendingAmount})`,
      )
      return NextResponse.json({ status: "ok" })
    }

    const truckMatch = text.match(TRUCK_REGEX)
    if (truckMatch) {
      const truckNumber = truckMatch[0].toUpperCase()
      const location = text
        .replace(truckMatch[0], "")
        .replace(/[,;:-]+/g, "")
        .trim()

      const owner = await ensureOwner(supabase, from)

      if (!owner) {
        await sendWhatsAppMessage(from, "Kuch gadbad hui. Phir se 'START' bhejo.")
        return NextResponse.json({ status: "ok" })
      }

      const { data: truck } = await supabase
        .from("trucks")
        .select("id")
        .eq("truck_number", truckNumber)
        .maybeSingle()

      if (truck) {
        await supabase.from("trips").insert({
          truck_id: truck.id,
          owner_id: owner.id,
          source_location: location || null,
          material: "sand",
          payment_status: "pending",
          status: "active",
        })
      } else {
        const { data: newTruck } = await supabase
          .from("trucks")
          .insert({ owner_id: owner.id, truck_number: truckNumber })
          .select("id")
          .maybeSingle()

        if (!newTruck) {
          await sendWhatsAppMessage(from, "Truck register nahi ho paya.")
          return NextResponse.json({ status: "ok" })
        }

        await supabase.from("trips").insert({
          truck_id: newTruck.id,
          owner_id: owner.id,
          source_location: location || null,
          material: "sand",
          payment_status: "pending",
          status: "active",
        })
      }

      const locationMsg = location ? ` — ${location} se nikla` : ""
      await sendWhatsAppMessage(
        from,
        `Trip record ho gayi! Truck ${truckNumber}${locationMsg}. Safe drive karo bhai 🚛`,
      )
      return NextResponse.json({ status: "ok" })
    }

    await sendWhatsAppMessage(
      from,
      "Commands: START karo, trip ke liye truck number + location bhejo, PAHUNCHA bhejo jab pohoncho, HISAAB bhejo report ke liye",
    )

    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
