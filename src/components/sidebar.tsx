"use client";

import { cn } from "../lib/utils"; // Corrected import path
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  X,
  FilePenLine,
  Search,
  FolderKanban,
  Settings,
} from "lucide-react"; // Added icons
import { ScrollArea } from "../components/ui/scroll-area"; // Added ScrollArea

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  const paddingX = open ? "px-4" : "px-3";
  const alignItems = !open ? "items-center" : "";

  // Extract the static children (Links, Profile div) passed from layout.tsx
  // We expect children to be a ReactNode, likely the div containing the structure
  // Let's assume children is the <div className="flex flex-col h-full p-4 overflow-hidden">...</div> element
  // We need to render the conditional parts *around* the static parts. This is tricky.

  // Alternative approach: Pass the conditional elements directly here instead of layout.tsx
  // Let's redefine DesktopSidebar to render the full structure internally.

  return (
    <motion.div
      // Apply conditional padding and alignment
      className={cn(
        "h-full py-4 hidden md:flex md:flex-col bg-neutral-100 dark:bg-neutral-800 w-[300px] flex-shrink-0 overflow-hidden", // Added overflow-hidden
        paddingX,
        alignItems,
        className
      )}
      animate={{
        width: animate ? (open ? "300px" : "60px") : "300px",
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {/* Render the full structure directly inside DesktopSidebar */}
      <div className={cn("flex flex-col h-full", !open ? "p-3" : "p-4")}> {/* Adjust padding here */}
        {/* Top Static Section */}
        <div>
          <SidebarLink
            link={{
              label: "New Document",
              href: "/",
              icon: <FilePenLine className="w-4 h-4" />,
            }}
          />
          {open && ( /* Conditionally render Search */
            <div className="relative my-4">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-neutral-500 w-4 h-4" />
              <input
                type="search"
                placeholder="Search docs..."
                className="w-full pl-8 pr-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded bg-neutral-50 dark:bg-neutral-700 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}
          <SidebarLink
            link={{
              label: "Docs",
              href: "/docs",
              icon: <FolderKanban className="w-4 h-4" />,
            }}
          />
        </div>

        {/* Middle Scrollable History Section */}
        {open && ( /* Conditionally render History */
          <ScrollArea className="flex-grow my-4 border-t border-b border-neutral-200 dark:border-neutral-700">
            <div className="p-2">
              <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase mb-2">History</h3>
              <a href="#" className="block text-sm py-1 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded px-2">Document 1</a>
              <a href="#" className="block text-sm py-1 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded px-2">Report Alpha</a>
              <a href="#" className="block text-sm py-1 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded px-2">Meeting Notes - Project X</a>
              {/* Add more placeholders */}
            </div>
          </ScrollArea>
        )}

        {/* Bottom Static Section */}
        <div className="mt-auto">
          <div className="flex items-center gap-2 mb-2 p-2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer">
            <div className="w-6 h-6 bg-neutral-300 dark:bg-neutral-600 rounded-full flex-shrink-0"></div> {/* Profile Placeholder */}
            {open && ( /* Conditionally render User Name */
              <span className="text-sm text-neutral-700 dark:text-neutral-200">User Name</span>
            )}
          </div>
          <SidebarLink
            link={{
              label: "Settings",
              href: "/settings",
              icon: <Settings className="w-4 h-4" />,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-neutral-100 dark:bg-neutral-800 w-full"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <Menu
            className="text-neutral-800 dark:text-neutral-200 cursor-pointer"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              // Mobile panel structure remains the same as it was already correct
              className={cn(
                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-10 z-[100] flex flex-col justify-between",
                className
              )}
            >
              <div
                className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                onClick={() => setOpen(!open)}
              >
                <X />
              </div>
              {/* Replicated structure from layout.tsx inside mobile panel */}
              <div className="flex flex-col h-full pt-10"> {/* Added padding top and flex structure */}
                {/* Top Static Section */}
                <div>
                  <SidebarLink
                    link={{
                      label: "New Document",
                      href: "/", // Assuming root is for new doc for now
                      icon: <FilePenLine className="w-4 h-4" />,
                    }}
                  />
                  <div className="relative my-4"> {/* Search Bar */}
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-neutral-500 w-4 h-4" />
                    <input
                      type="search"
                      placeholder="Search docs..."
                      className="w-full pl-8 pr-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded bg-neutral-50 dark:bg-neutral-700 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <SidebarLink
                    link={{
                      label: "Docs",
                      href: "/docs", // Example path
                      icon: <FolderKanban className="w-4 h-4" />,
                    }}
                  />
                </div>

                {/* Middle Scrollable History Section */}
                <ScrollArea className="flex-grow my-4 border-t border-b border-neutral-200 dark:border-neutral-700">
                  <div className="p-2"> {/* Padding inside scroll area */}
                    <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase mb-2">History</h3>
                    {/* Placeholder History Items */}
                    <a href="#" className="block text-sm py-1 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded px-2">Document 1</a>
                    <a href="#" className="block text-sm py-1 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded px-2">Report Alpha</a>
                    <a href="#" className="block text-sm py-1 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded px-2">Meeting Notes - Project X</a>
                    <a href="#" className="block text-sm py-1 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded px-2">Draft Proposal</a>
                    <a href="#" className="block text-sm py-1 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded px-2">Analysis Results</a>
                     {/* Add more placeholders as needed */}
                  </div>
                </ScrollArea>

                {/* Bottom Static Section */}
                <div className="mt-auto pb-4"> {/* Pushes to bottom, added padding bottom */}
                   <div className="flex items-center gap-2 mb-2 p-2 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer">
                     <div className="w-6 h-6 bg-neutral-300 dark:bg-neutral-600 rounded-full flex-shrink-0"></div> {/* Profile Placeholder */}
                     <span className="text-sm text-neutral-700 dark:text-neutral-200">User Name</span> {/* Placeholder Name */}
                   </div>
                  <SidebarLink
                    link={{
                      label: "Settings",
                      href: "/settings", // Example path
                      icon: <Settings className="w-4 h-4" />,
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
  props?: LinkProps;
}) => {
  const { open, animate } = useSidebar();
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center gap-2 group/sidebar py-2",
        open ? "justify-start" : "justify-center", // Conditionally center icon when collapsed
        className
      )}
      {...props}
    >
      {link.icon}
      <motion.span
        animate={{
          // Animate width and opacity instead of display
          opacity: animate ? (open ? 1 : 0) : 1,
          width: animate ? (open ? "auto" : 0) : "auto",
        }}
        transition={{ // Add transition for smoother effect
          duration: 0.2,
          ease: "linear"
        }}
        className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0 overflow-hidden" // Added overflow-hidden
      >
        {link.label}
      </motion.span>
    </Link>
  );
};
