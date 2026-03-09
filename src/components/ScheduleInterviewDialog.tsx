import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Video, Link2, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ScheduleInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  candidateEmail: string;
  testTitle: string;
}

const ScheduleInterviewDialog = ({
  open,
  onOpenChange,
  candidateName,
  candidateEmail,
  testTitle,
}: ScheduleInterviewDialogProps) => {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("10:00");
  const [meetingLink, setMeetingLink] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!date || !time || !meetingLink.trim()) {
      toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }

    // Basic URL validation
    try {
      new URL(meetingLink.trim());
    } catch {
      toast({ title: "Invalid link", description: "Please enter a valid meeting URL.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const [hours, minutes] = time.split(":").map(Number);
      const scheduledDate = new Date(date);
      scheduledDate.setHours(hours, minutes, 0, 0);

      const { error } = await supabase.functions.invoke("send-candidate-email", {
        body: {
          candidateEmail,
          candidateName,
          testTitle,
          type: "interview_scheduled",
          interviewDate: scheduledDate.toISOString(),
          meetingLink: meetingLink.trim(),
        },
      });

      if (error) throw error;

      toast({ title: "Interview scheduled!", description: `Confirmation email sent to ${candidateName}.` });
      onOpenChange(false);
      setDate(undefined);
      setTime("10:00");
      setMeetingLink("");
    } catch {
      toast({ title: "Failed to send", description: "Could not send the interview email. Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Video className="h-5 w-5 text-primary" />
            Schedule Interview
          </DialogTitle>
          <DialogDescription>
            Send {candidateName} an interview invitation with a meeting link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Time
            </Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Meeting Link
            </Label>
            <Input
              placeholder="https://meet.google.com/abc-defg-hij"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Paste a Google Meet, Zoom, or Microsoft Teams link
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
            {sending ? "Sending..." : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleInterviewDialog;
