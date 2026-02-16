import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    // Verify request with secret token for security
    // const authHeader = request.headers.get('authorization');
    // const expectedToken = process.env.AUTO_CLOCK_OUT_TOKEN;
    
    // if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    //   return Response.json({ error: "Unauthorized" }, { status: 401 });
    // }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Get settings to check auto_clock_out_time
    const { data: settingsData, error: settingsError } = await supabase
      .from("settings")
      .select("auto_clock_out_time")
      .limit(1)
      .single();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      return Response.json({ error: "Failed to fetch settings" }, { status: 500 });
    }

    const autoClockOutTime = settingsData?.auto_clock_out_time;

    if (!autoClockOutTime) {
      return Response.json({ message: "Auto clock-out time not configured" }, { status: 200 });
    }

    // Parse the time - handle different formats
    let hours: number, minutes: number;
    
    // Check if it's 12-hour format with AM/PM
    if (autoClockOutTime.toLowerCase().includes('am') || autoClockOutTime.toLowerCase().includes('pm')) {
      const [time, period] = autoClockOutTime.trim().split(/\s+/);
      const [h, m] = time.split(":").map((n: string) => parseInt(n, 10) || 0);
      hours = h;
      if (period?.toLowerCase() === "pm" && h !== 12) {
        hours += 12;
      }
      if (period?.toLowerCase() === "am" && h === 12) {
        hours = 0;
      }
      minutes = m || 0;
    } else if (autoClockOutTime.includes(':')) {
      // Handle HH:MM format (24-hour)
      const timeParts = autoClockOutTime.split(':');
      hours = parseInt(timeParts[0], 10);
      minutes = parseInt(timeParts[1], 10);
    } else {
      // Handle simple numeric format
      const timeNum = parseInt(autoClockOutTime, 10);
      hours = timeNum;
      minutes = 0;
    }

    // Validate parsed time
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return Response.json({ error: "Invalid auto clock-out time format" }, { status: 400 });
    }

    // Check if current time is after the auto clock-out time
    const autoClockOutDateTime = new Date();
    autoClockOutDateTime.setHours(hours, minutes, 0, 0);
    
    if (new Date() < autoClockOutDateTime) {
      return Response.json({ message: "Auto clock-out time not reached yet" }, { status: 200 });
    }

    // Get attendance records that have clock_in but no clock_out for today
    const { data: unclosedRecords, error: attendanceError } = await supabase
      .from("attendance")
      .select("id, clock_in")
      .eq("date", todayStr)
      .not("clock_in", "is", null)
      .is("clock_out", null);

    if (attendanceError) {
      console.error("Error fetching unclosed attendance records:", attendanceError);
      return Response.json({ error: "Failed to fetch attendance records" }, { status: 500 });
    }

    if (!unclosedRecords || unclosedRecords.length === 0) {
      return Response.json({ message: "No unclosed attendance records to process" }, { status: 200 });
    }

    // Calculate clock-out time based on settings
    const clockOutAt = new Date();
    clockOutAt.setHours(hours, minutes, 0, 0);
    
    // Validate the clockOutAt date
    if (isNaN(clockOutAt.getTime())) {
      return Response.json({ error: "Invalid clock-out time calculation" }, { status: 500 });
    }

    const clockOutDate = new Date(clockOutAt);

    // Process each unclosed record
    let processedCount = 0;
    for (const record of unclosedRecords) {
      if (record.clock_in) {
        const clockIn = new Date(record.clock_in);
        const totalHours = (clockOutDate.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        
        // Validate the total hours calculation
        if (isNaN(totalHours) || totalHours < 0) {
          continue;
        }
        
        const { error: updateError } = await supabase
          .from("attendance")
          .update({
            clock_out: clockOutAt.toISOString(),
            total_hours: parseFloat(totalHours.toFixed(2)),
          })
          .eq("id", record.id);

        if (!updateError) {
          processedCount++;
        }
      }
    }

    return Response.json({ 
      message: `Successfully processed ${processedCount} attendance records`,
      processedCount 
    }, { status: 200 });

  } catch (error) {
    console.error("Unexpected error in auto clock-out API:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}