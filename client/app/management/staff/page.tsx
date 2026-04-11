"use client";

import { useState } from "react";
import { useGetStaffQuery, useCreateStaffMutation, useDeleteStaffMutation } from "../../../lib/features/staff/staffApiSlice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function StaffDirectory() {
  const [page, setPage] = useState(1);
  const [expertise, setExpertise] = useState("all");
  const [showForm, setShowForm] = useState(false);
  
  const [newStaff, setNewStaff] = useState({ name: "", phoneNumber: "", expertise: "fire" });

  const { data, isLoading } = useGetStaffQuery({ page, expertise });
  const [createStaff] = useCreateStaffMutation();
  const [deleteStaff] = useDeleteStaffMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStaff(newStaff).unwrap();
      toast.success("Staff member registered", {
        description: `${newStaff.name} added to the ${newStaff.expertise} response team.`,
      });
      setShowForm(false);
      setNewStaff({ name: "", phoneNumber: "", expertise: "fire" });
    } catch (err) {
      toast.error("Failed to register staff", {
        description: "Please check the details and try again.",
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteStaff(id).unwrap();
      toast.info("Staff member removed", {
        description: `${name} has been removed from the registry.`,
      });
    } catch (err) {
      toast.error("Failed to remove staff", {
        description: "An error occurred. Please try again.",
      });
    }
  };

  const expertiseColors: Record<string, string> = {
    fire: "bg-red-500/10 text-red-500 border-red-500/30",
    security: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    medical: "bg-green-500/10 text-green-500 border-green-500/30",
    all: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  };

  return (
    <div className="mx-auto max-w-[1000px]">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="headline text-2xl font-extrabold text-primary">STAFF DIRECTORY</h1>
          <p className="text-sm text-muted-foreground">Crisis response personnel registry</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="font-semibold">
          + REGISTER STAFF
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {['all', 'fire', 'security', 'medical'].map((exp) => (
          <Button
            key={exp}
            variant={expertise === exp ? "default" : "outline"}
            size="sm"
            className="rounded-full text-xs font-semibold uppercase"
            onClick={() => { setExpertise(exp); setPage(1); }}
          >
            {exp}
          </Button>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="mb-6 border-primary/30 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">NEW STAFF REGISTRATION</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-xs text-muted-foreground">NAME</Label>
                <Input value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} required className="bg-muted/30 border-border/50" />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-xs text-muted-foreground">PHONE</Label>
                <Input value={newStaff.phoneNumber} onChange={e => setNewStaff({ ...newStaff, phoneNumber: e.target.value })} required className="bg-muted/30 border-border/50" />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-xs text-muted-foreground">EXPERTISE</Label>
                <Select value={newStaff.expertise} onValueChange={(value) => setNewStaff({ ...newStaff, expertise: value })}>
                  <SelectTrigger className="bg-muted/30 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fire">FIRE</SelectItem>
                    <SelectItem value="security">SECURITY</SelectItem>
                    <SelectItem value="medical">MEDICAL</SelectItem>
                    <SelectItem value="all">ALL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="font-semibold">SAVE</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>CANCEL</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground font-semibold tracking-wider">NAME</TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold tracking-wider">PHONE</TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold tracking-wider">EXPERTISE</TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold tracking-wider">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Mobilizing Staff Directory...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : data?.staff?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8 italic">
                  No staff members registered. Click "Register Staff" to add one.
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoading && data?.staff?.map((staff: any) => (
              <TableRow key={staff._id} className="border-border/20 hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">{staff.name}</TableCell>
                <TableCell className="text-muted-foreground">{staff.phoneNumber}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[0.65rem] font-bold ${expertiseColors[staff.expertise] || expertiseColors.all}`}>
                    {staff.expertise.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-semibold"
                    onClick={() => handleDelete(staff._id, staff.name)}
                  >
                    REMOVE
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
          className="disabled:opacity-30"
        >
          PREVIOUS
        </Button>
        <span className="text-sm text-muted-foreground">
          PAGE {page} OF {data?.totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page === (data?.totalPages || 1)}
          onClick={() => setPage(p => p + 1)}
          className="disabled:opacity-30"
        >
          NEXT
        </Button>
      </div>
    </div>
  );
}
