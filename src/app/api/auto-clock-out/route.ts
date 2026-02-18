import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current date in YYYY-MM-DD format (local date to match attendance records)
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Get settings to check auto_clock_out_time
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("auto_clock_out_time")
      .limit(1)
      .single();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      return Response.json({ error: "Failed to fetch settings" }, { status: 500 });
    }

    const autoClockOutTime = settings?.auto_clock_out_time;
    if (!autoClockOutTime) {
      return Response.json({ message: "Auto clock-out time not configured" }, { status: 200 });
    }

    // Parse time with comprehensive format support
    const parsedTime = parseTime(autoClockOutTime);
    if (!parsedTime) {
      return Response.json({ error: "Invalid auto clock-out time format" }, { status: 400 });
    }

    const { hours, minutes } = parsedTime;

    // Check if current time is after the auto clock-out time
    const autoClockOutDateTime = new Date();
    autoClockOutDateTime.setHours(hours, minutes, 0, 0);
    
    if (new Date() < autoClockOutDateTime) {
      return Response.json({ message: "Auto clock-out time not reached yet" }, { status: 200 });
    }

    // Get attendance records that need auto clock-out
    const { data: unclosedRecords, error: attendanceError } = await supabase
      .from("attendance")
      .select("id, clock_in")
      .eq("date", todayStr)
      .not("clock_in", "is", null)
      .is("clock_out", null);

    if (attendanceError) {
      console.error("Error fetching attendance records:", attendanceError);
      return Response.json({ error: "Failed to fetch attendance records" }, { status: 500 });
    }

    if (!unclosedRecords || unclosedRecords.length === 0) {
      return Response.json({ message: "No unclosed attendance records to process" }, { status: 200 });
    }

    // Process each unclosed record
    let processedCount = 0;
    const clockOutTime = autoClockOutDateTime.toISOString();
    
    for (const record of unclosedRecords) {
      if (!record.clock_in) continue;
      
      try {
        const clockIn = new Date(record.clock_in);
        const totalHours = (autoClockOutDateTime.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        
        if (totalHours >= 0) {
          const { error: updateError } = await supabase
            .from("attendance")
            .update({
              clock_out: clockOutTime,
              total_hours: parseFloat(totalHours.toFixed(2)),
            })
            .eq("id", record.id);

          if (!updateError) {
            processedCount++;
          }
        }
      } catch (recordError) {
        console.error(`Error processing record ${record.id}:`, recordError);
        continue;
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

// Helper function to parse time in various formats
function parseTime(timeString: string): { hours: number; minutes: number } | null {
  if (!timeString) return null;
  
  const cleanTime = timeString.trim().toLowerCase();
  
  // Handle 12-hour format with AM/PM
  if (cleanTime.includes('am') || cleanTime.includes('pm')) {
    const [timePart, period] = cleanTime.split(/\s+/);
    const [hourStr, minuteStr] = timePart.split(':');
    
    let hours = parseInt(hourStr, 10) || 0;
    const minutes = parseInt(minuteStr, 10) || 0;
    
    // Convert to 24-hour format
    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }
    
    return validateTime(hours, minutes) ? { hours, minutes } : null;
  }
  
  // Handle 24-hour format (HH:MM)
  if (cleanTime.includes(':')) {
    const [hourStr, minuteStr] = cleanTime.split(':');
    const hours = parseInt(hourStr, 10);
    const minutes = parseInt(minuteStr, 10) || 0;
    
    return validateTime(hours, minutes) ? { hours, minutes } : null;
  }
  
  // Handle simple numeric format (hours only)
  const hours = parseInt(cleanTime, 10);
  return validateTime(hours, 0) ? { hours, minutes: 0 } : null;
}

function validateTime(hours: number, minutes: number): boolean {
  return !isNaN(hours) && !isNaN(minutes) && 
         hours >= 0 && hours <= 23 && 
         minutes >= 0 && minutes <= 59;
}