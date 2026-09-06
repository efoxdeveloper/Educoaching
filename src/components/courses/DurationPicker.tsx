"use client";

import { useEffect, useState } from "react";
import { Clock, Calendar } from "lucide-react";
import {
  parseCourseDuration,
  formatCourseDuration,
  calculateCourseEndDate,
} from "@/lib/course-duration";
import { formatDate } from "@/lib/utils";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";

export function DurationPicker({
  value,
  onChange,
  label = "Course Duration",
}: {
  value: string;
  onChange: (val: string) => void;
  label?: string;
}) {
  const [years, setYears] = useState(1);
  const [months, setMonths] = useState(0);
  const [days, setDays] = useState(0);

  // Sync internal state when incoming value changes
  useEffect(() => {
    if (value) {
      const parts = parseCourseDuration(value);
      setYears(parts.years);
      setMonths(parts.months);
      setDays(parts.days);
    }
  }, [value]);

  const handleCustomChange = (y: number, m: number, d: number) => {
    const cleanY = Math.max(0, y);
    const cleanM = Math.max(0, m);
    const cleanD = Math.max(0, d);

    setYears(cleanY);
    setMonths(cleanM);
    setDays(cleanD);

    const formatted = formatCourseDuration({ years: cleanY, months: cleanM, days: cleanD });
    onChange(formatted);
  };

  const sampleEndDate = calculateCourseEndDate(new Date(), value || "1 Year");

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: "12px",
        borderColor: "#D6E0EB",
        bgcolor: "rgba(247,245,240,0.4)",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: "#1E293b",
            fontSize: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: 0.75,
          }}
        >
          <Clock size={14} style={{ color: "#475569" }} />
          {label}
        </Typography>
        <Chip
          label="Custom (Years / Months / Days)"
          size="small"
          variant="outlined"
          sx={{ fontSize: "10px", fontWeight: 600, color: "#7E9BBC", borderColor: "#D6E0EB", height: 20, bgcolor: "white" }}
        />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
        <TextField
          label="Years"
          type="number"
          fullWidth
          size="small"
          value={years}
          onChange={(e) => handleCustomChange(parseInt(e.target.value) || 0, months, days)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0, max: 10 } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", "& input": { textAlign: "center", fontWeight: 600, fontSize: "0.875rem" } } }}
        />
        <TextField
          label="Months"
          type="number"
          fullWidth
          size="small"
          value={months}
          onChange={(e) => handleCustomChange(years, parseInt(e.target.value) || 0, days)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0, max: 24 } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", "& input": { textAlign: "center", fontWeight: 600, fontSize: "0.875rem" } } }}
        />
        <TextField
          label="Days"
          type="number"
          fullWidth
          size="small"
          value={days}
          onChange={(e) => handleCustomChange(years, months, parseInt(e.target.value) || 0)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0, max: 365 } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px", bgcolor: "white", "& input": { textAlign: "center", fontWeight: 600, fontSize: "0.875rem" } } }}
        />
      </Box>

      <Paper
        variant="outlined"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1.25,
          borderRadius: "12px",
          borderColor: "#D6E0EB",
          bgcolor: "white",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 20,
              height: 20,
              borderRadius: "9999px",
              bgcolor: "#EEF2F7",
              color: "#1E3A5F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            ✓
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E3A5F", fontSize: "0.875rem" }}>
            {value || "1 Year"}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <Calendar size={11} style={{ color: "#94A3B8" }} />
          <Typography variant="caption" sx={{ fontSize: "11px", color: "#64748b" }}>
            Finishes: ~{formatDate(sampleEndDate)}
          </Typography>
        </Stack>
      </Paper>
    </Paper>
  );
}
