import React, { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { backupApi } from '@/lib/api';
import {
  Download, Upload, Database, CheckCircle2, AlertTriangle,
  Users, Building2, FileText, Clock, Shield, Loader2, Info
} from 'lucide-react';
import { format } from 'date-fns';

type ValidationResult = {
  valid: boolean;
  exportedAt?: string;
  counts: Record<string, number>;
};

type ImportResult = {
  success: boolean;
  message: string;
  importedCounts: Record<string, number>;
};

const TABLE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  users:            { label: 'Employees & Managers', icon: <Users className="h-3.5 w-3.5" /> },
  departments:      { label: 'Departments',           icon: <Building2 className="h-3.5 w-3.5" /> },
  userGroups:       { label: 'User Groups',           icon: <Users className="h-3.5 w-3.5" /> },
  employeeTypes:    { label: 'Employee Types',        icon: <FileText className="h-3.5 w-3.5" /> },
  leaveBalances:    { label: 'Leave Balances',        icon: <FileText className="h-3.5 w-3.5" /> },
  leaveRequests:    { label: 'Leave Requests',        icon: <FileText className="h-3.5 w-3.5" /> },
  leaveRules:       { label: 'Leave Rules',           icon: <FileText className="h-3.5 w-3.5" /> },
  leaveRulePhases:  { label: 'Leave Rule Phases',     icon: <FileText className="h-3.5 w-3.5" /> },
  attendanceRecords:{ label: 'Attendance Records',    icon: <Clock className="h-3.5 w-3.5" /> },
  grievances:       { label: 'Grievances',            icon: <FileText className="h-3.5 w-3.5" /> },
  publicHolidays:   { label: 'Public Holidays',       icon: <FileText className="h-3.5 w-3.5" /> },
  settings:         { label: 'System Settings',       icon: <Shield className="h-3.5 w-3.5" /> },
  notifications:    { label: 'Notifications',         icon: <FileText className="h-3.5 w-3.5" /> },
};

export default function DatabaseBackupSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [lastExportTime, setLastExportTime] = useState<Date | null>(null);

  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [pendingBackup, setPendingBackup] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      toast({ title: "Preparing backup…", description: "Collecting all data — this may take a moment." });
      const blob = await backupApi.export();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aece-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLastExportTime(new Date());
      toast({ title: "Backup downloaded", description: "Keep this file in a safe place." });
    } catch {
      toast({ variant: "destructive", title: "Export failed", description: "Could not generate the backup file." });
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidation(null);
    setPendingBackup(null);
    setImportResult(null);
    setValidating(true);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      const result = await backupApi.validate(backup);
      setValidation(result);
      if (result.valid) {
        setPendingBackup(backup);
      } else {
        toast({ variant: "destructive", title: "Invalid file", description: "This file is not a valid AECE backup." });
      }
    } catch {
      toast({ variant: "destructive", title: "Could not read file", description: "Make sure you selected a .json backup file." });
    } finally {
      setValidating(false);
      e.target.value = '';
    }
  };

  const handleImport = async () => {
    if (!pendingBackup) return;
    setImporting(true);
    setImportResult(null);
    try {
      toast({ title: "Restoring…", description: "Importing records into the database." });
      const result = await backupApi.import(pendingBackup);
      setImportResult(result);
      queryClient.invalidateQueries();
      toast({ title: "Restore complete", description: result.message });
      setPendingBackup(null);
      setValidation(null);
    } catch {
      toast({ variant: "destructive", title: "Import failed", description: "Could not restore the backup." });
    } finally {
      setImporting(false);
    }
  };

  const totalBackupRecords = validation
    ? Object.values(validation.counts).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 dark:text-slate-100">Database Backup</h1>
        <p className="text-muted-foreground">Download a complete snapshot of all data, or restore from a previous backup.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Download ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Download Backup
            </CardTitle>
            <CardDescription>
              Export the entire database as a single JSON file — suitable for reinstalling on a new server or migrating to a new environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">What's included</p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(TABLE_LABELS).map(([key, { label, icon }]) => (
                  <div key={key} className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                    {icon}
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 flex gap-2 text-sm text-amber-800 dark:text-amber-300">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Photos and face recognition data are included as base64. Files may be large if many employees have photos.</span>
            </div>

            {lastExportTime && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Last downloaded {format(lastExportTime, "d MMM yyyy 'at' HH:mm")}
              </p>
            )}

            <Button onClick={handleExport} disabled={exporting} className="w-full" size="lg" data-testid="backup-export">
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {exporting ? 'Preparing…' : 'Download Backup'}
            </Button>
          </CardContent>
        </Card>

        {/* ── Upload / Restore ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Restore from Backup
            </CardTitle>
            <CardDescription>
              Upload a backup file to restore data. Existing records are kept — only records that don't already exist will be added.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* File picker */}
            <div
              className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}
              data-testid="backup-drop-zone"
            >
              <Database className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Click to select a backup file</p>
              <p className="text-xs text-muted-foreground mt-1">Only .json backup files from this system are accepted</p>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
                data-testid="backup-import"
              />
            </div>

            {/* Validating spinner */}
            {validating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking backup file…
              </div>
            )}

            {/* Validation preview */}
            {validation && validation.valid && pendingBackup && (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-300">Valid backup file</span>
                  <Badge variant="secondary" className="ml-auto text-xs">{totalBackupRecords} total records</Badge>
                </div>
                {validation.exportedAt && (
                  <p className="text-xs text-muted-foreground">
                    Exported: {format(new Date(validation.exportedAt), "d MMM yyyy 'at' HH:mm")}
                  </p>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-1 text-xs text-slate-700 dark:text-slate-300">
                  {Object.entries(validation.counts).map(([key, count]) => (
                    count > 0 && (
                      <div key={key} className="flex justify-between gap-2">
                        <span>{TABLE_LABELS[key]?.label || key}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    )
                  ))}
                </div>
                <Button onClick={handleImport} disabled={importing} className="w-full mt-2" data-testid="backup-confirm-import">
                  {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {importing ? 'Restoring…' : 'Restore This Backup'}
                </Button>
              </div>
            )}

            {/* Invalid backup warning */}
            {validation && !validation.valid && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 flex gap-2 text-sm text-red-700 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                This file is not a valid AECE backup. Please select a file previously exported from this system.
              </div>
            )}

            {/* Import result */}
            {importResult && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Restore complete</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-slate-700 dark:text-slate-300">
                  {Object.entries(importResult.importedCounts).map(([key, count]) => (
                    <div key={key} className="flex justify-between gap-2">
                      <span>{TABLE_LABELS[key]?.label || key}</span>
                      <span className="font-semibold">+{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No file selected yet */}
            {!validating && !validation && !importResult && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800/50 p-3 flex gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                Existing records are never overwritten — only missing records from the backup will be added.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
