"use client";

import { ChevronDown, Info, LogOut, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Demo } from "./section";

export function Overlays() {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      <Demo label="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="self-start">
              Remove business
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Bean House?</DialogTitle>
              <DialogDescription>
                Its checks stop and its plan ends at the next renewal. Past reports stay available for 30 days.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Keep business</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive">Remove business</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Demo>

      <Demo label="Sheet">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="self-start">
              Open fix steps
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Get more Google reviews</SheetTitle>
              <SheetDescription>Daily Grind has 320 reviews at 4.7. You have 12 at 4.2.</SheetDescription>
            </SheetHeader>
            <ol className="flex list-decimal flex-col gap-2 px-4 pl-9 text-sm">
              <li>Ask your last 20 customers for a review by text.</li>
              <li>Add a review link to your receipts.</li>
              <li>Reply to every review within two days.</li>
            </ol>
            <SheetFooter>
              <Button>Mark as done</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </Demo>

      <Demo label="Dropdown menu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="self-start">
              Bean House
              <ChevronDown data-icon="inline-end" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Signed in as owner</DropdownMenuLabel>
            <DropdownMenuItem>
              <Settings />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LogOut />
              Sign out
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <Trash2 />
              Remove business
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Demo>

      <Demo label="Tooltip">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="What is the visibility score?">
              <Info />
            </Button>
          </TooltipTrigger>
          <TooltipContent>How often AI mentions you, over the last 30 days</TooltipContent>
        </Tooltip>
      </Demo>

      <Demo label="Toasts">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast.success("Changes saved")}>
            Save changes
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.error("Check failed. No credits were used. Try again in a few minutes.")}
          >
            Show error
          </Button>
          <Button variant="outline" onClick={() => toast("Check started. Results in about 2 minutes.")}>
            Start check
          </Button>
        </div>
      </Demo>

      <Demo label="Tabs">
        <Tabs defaultValue="visibility">
          <TabsList>
            <TabsTrigger value="visibility">Visibility</TabsTrigger>
            <TabsTrigger value="competitors">Competitors</TabsTrigger>
            <TabsTrigger value="fixes">Fix steps</TabsTrigger>
          </TabsList>
          <TabsContent value="visibility" className="text-muted-foreground">
            Mentioned in 22 of 36 checks.
          </TabsContent>
          <TabsContent value="competitors" className="text-muted-foreground">
            Daily Grind leads with 71%.
          </TabsContent>
          <TabsContent value="fixes" className="text-muted-foreground">
            3 open fix steps.
          </TabsContent>
        </Tabs>
      </Demo>
    </div>
  );
}
