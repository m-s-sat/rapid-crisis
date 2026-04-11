"use client";

import { useState } from "react";
import { useGetGuestsQuery, useCreateGuestMutation, useCheckOutGuestMutation } from "../../../lib/features/guest/guestApiSlice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

export default function GuestRegistry() {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: "", room_id: "", phoneNumber: "" });

  const { data, isLoading } = useGetGuestsQuery({ page });
  const [createGuest] = useCreateGuestMutation();
  const [checkOutGuest] = useCheckOutGuestMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGuest(newGuest).unwrap();
      toast.success("Guest checked in successfully", {
        description: `${newGuest.name} registered to Room ${newGuest.room_id}.`,
      });
      setShowForm(false);
      setNewGuest({ name: "", room_id: "", phoneNumber: "" });
    } catch (err) {
      toast.error("Failed to check in guest", {
        description: "Please verify the details and try again.",
      });
    }
  };

  const handleCheckOut = async (id: string, name: string) => {
    try {
      await checkOutGuest(id).unwrap();
      toast.info("Guest checked out", {
        description: `${name} has been archived.`,
      });
    } catch (err) {
      toast.error("Failed to check out guest", {
        description: "An error occurred. Please try again.",
      });
    }
  };

  return (
    <div className="mx-auto max-w-[1000px]">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="headline text-2xl font-extrabold text-primary">GUEST REGISTRY</h1>
          <p className="text-sm text-muted-foreground">Live occupancy and check-in management</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="font-semibold">
          + NEW CHECK-IN
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="mb-6 border-primary/30 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">RECEPTION DESK</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-xs text-muted-foreground">GUEST NAME</Label>
                <Input value={newGuest.name} onChange={e => setNewGuest({ ...newGuest, name: e.target.value })} required className="bg-muted/30 border-border/50" />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-xs text-muted-foreground">ROOM / ID</Label>
                <Input value={newGuest.room_id} onChange={e => setNewGuest({ ...newGuest, room_id: e.target.value })} required className="bg-muted/30 border-border/50" />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-xs text-muted-foreground">PHONE</Label>
                <Input value={newGuest.phoneNumber} onChange={e => setNewGuest({ ...newGuest, phoneNumber: e.target.value })} required className="bg-muted/30 border-border/50" />
              </div>
              <Button type="submit" className="font-semibold">REGISTER</Button>
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
              <TableHead className="text-xs text-muted-foreground font-semibold tracking-wider">GUEST</TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold tracking-wider">ROOM / ID</TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold tracking-wider">STATUS</TableHead>
              <TableHead className="text-xs text-muted-foreground font-semibold tracking-wider">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.guests?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8 italic">
                  No guests registered. Click "New Check-In" to add one.
                </TableCell>
              </TableRow>
            )}
            {data?.guests?.map((guest: any) => (
              <TableRow key={guest._id} className="border-border/20 hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">{guest.name}</TableCell>
                <TableCell className="text-muted-foreground">{guest.room_id}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[0.65rem] font-bold ${
                      guest.status === 'active'
                        ? 'bg-green-500/10 text-green-500 border-green-500/30'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    {guest.status?.toUpperCase() || "UNKNOWN"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {guest.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-semibold text-primary"
                      onClick={() => handleCheckOut(guest._id, guest.name)}
                    >
                      CHECK OUT
                    </Button>
                  )}
                  {guest.status === 'checked_out' && (
                    <span className="text-xs text-muted-foreground">ARCHIVED</span>
                  )}
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
