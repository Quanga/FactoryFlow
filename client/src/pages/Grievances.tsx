import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from '@/lib/auth-context';
import { grievanceApi, userApi } from '@/lib/api';
import { useToast } from "@/hooks/use-toast";
import { Plus, Eye, Clock, CheckCircle2, AlertCircle, XCircle, MessageSquareWarning, Users, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Grievance, User } from '@shared/schema';

const GRIEVANCE_CATEGORIES = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'discrimination', label: 'Discrimination' },
  { value: 'safety', label: 'Safety Concern' },
  { value: 'policy', label: 'Policy Violation' },
  { value: 'working_conditions', label: 'Working Conditions' },
  { value: 'pay', label: 'Pay & Benefits' },
  { value: 'other', label: 'Other' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-700' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' },
];

export default function Grievances() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);
  
  const [formData, setFormData] = useState({
    targetType: 'company' as 'company' | 'employee',
    targetEmployeeId: '',
    category: '',
    title: '',
    description: '',
    priority: 'normal',
  });

  const { data: grievances = [], isLoading } = useQuery({
    queryKey: ['grievances', user?.id],
    queryFn: () => grievanceApi.getByUserId(user!.id),
    enabled: !!user,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getAll(),
    enabled: formData.targetType === 'employee',
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => grievanceApi.create({
      userId: user!.id,
      targetType: data.targetType,
      targetEmployeeId: data.targetType === 'employee' ? data.targetEmployeeId : null,
      category: data.category,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: 'submitted',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grievances'] });
      toast({ title: "Grievance Submitted", description: "Your grievance has been submitted for review." });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({
      targetType: 'company',
      targetEmployeeId: '',
      category: '',
      title: '',
      description: '',
      priority: 'normal',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-yellow-100 text-yellow-700';
      case 'in_review': return 'bg-blue-100 text-blue-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <Clock className="h-5 w-5" />;
      case 'in_review': return <AlertCircle className="h-5 w-5" />;
      case 'resolved': return <CheckCircle2 className="h-5 w-5" />;
      case 'rejected': return <XCircle className="h-5 w-5" />;
      case 'closed': return <CheckCircle2 className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleSubmit = () => {
    if (!formData.category || !formData.title || !formData.description) {
      toast({ variant: "destructive", title: "Error", description: "Please fill in all required fields." });
      return;
    }
    if (formData.targetType === 'employee' && !formData.targetEmployeeId) {
      toast({ variant: "destructive", title: "Error", description: "Please select the employee involved." });
      return;
    }
    createMutation.mutate(formData);
  };

  const otherEmployees = employees.filter(e => e.id !== user?.id);

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Grievances</h1>
            <p className="text-muted-foreground mt-1">Submit and track workplace complaints or concerns.</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-new-grievance">
            <Plus className="h-4 w-4 mr-2" />
            New Grievance
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading grievances...</div>
        ) : grievances.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <MessageSquareWarning className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Grievances Filed</h3>
              <p className="text-muted-foreground mb-4">You haven't submitted any grievances yet.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Submit Your First Grievance
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {grievances.map((grievance) => (
              <Card 
                key={grievance.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedGrievance(grievance);
                  setIsViewDialogOpen(true);
                }}
                data-testid={`grievance-card-${grievance.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getStatusColor(grievance.status)}`}>
                        {getStatusIcon(grievance.status)}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{grievance.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {grievance.targetType === 'company' ? (
                              <><Building2 className="h-3 w-3" /> Company</>
                            ) : (
                              <><Users className="h-3 w-3" /> Employee</>
                            )}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{grievance.category.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>{format(new Date(grievance.submittedAt), 'd MMM yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={PRIORITY_OPTIONS.find(p => p.value === grievance.priority)?.color || 'bg-gray-100'}>
                        {grievance.priority}
                      </Badge>
                      <Badge className={getStatusColor(grievance.status)}>
                        {formatStatus(grievance.status)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Grievance Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit a Grievance</DialogTitle>
            <DialogDescription>
              Use this form to report a workplace concern or complaint. All submissions are confidential.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Who is this grievance against?</Label>
              <RadioGroup
                value={formData.targetType}
                onValueChange={(value) => setFormData({ ...formData, targetType: value as 'company' | 'employee', targetEmployeeId: '' })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="company" id="target-company" />
                  <Label htmlFor="target-company" className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="h-4 w-4" />
                    The Company
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="employee" id="target-employee" />
                  <Label htmlFor="target-employee" className="flex items-center gap-2 cursor-pointer">
                    <Users className="h-4 w-4" />
                    An Employee
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {formData.targetType === 'employee' && (
              <div className="space-y-2">
                <Label htmlFor="targetEmployee">Select Employee</Label>
                <Select
                  value={formData.targetEmployeeId}
                  onValueChange={(value) => setFormData({ ...formData, targetEmployeeId: value })}
                >
                  <SelectTrigger data-testid="select-target-employee">
                    <SelectValue placeholder="Select the employee involved" />
                  </SelectTrigger>
                  <SelectContent>
                    {otherEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.surname} ({emp.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {GRIEVANCE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Brief summary of your grievance"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Please provide details about your grievance. Include dates, times, and any witnesses if applicable."
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-grievance">
              {createMutation.isPending ? 'Submitting...' : 'Submit Grievance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Grievance Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Grievance Details</DialogTitle>
          </DialogHeader>
          {selectedGrievance && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={getStatusColor(selectedGrievance.status)}>
                  {formatStatus(selectedGrievance.status)}
                </Badge>
                <Badge className={PRIORITY_OPTIONS.find(p => p.value === selectedGrievance.priority)?.color || 'bg-gray-100'}>
                  {selectedGrievance.priority} priority
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Title</p>
                <p className="font-medium">{selectedGrievance.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Against</p>
                  <p className="font-medium flex items-center gap-1">
                    {selectedGrievance.targetType === 'company' ? (
                      <><Building2 className="h-4 w-4" /> The Company</>
                    ) : (
                      <><Users className="h-4 w-4" /> An Employee</>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium capitalize">{selectedGrievance.category.replace('_', ' ')}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{selectedGrievance.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p>{format(new Date(selectedGrievance.submittedAt), 'd MMM yyyy h:mm a')}</p>
                </div>
                {selectedGrievance.resolvedAt && (
                  <div>
                    <p className="text-muted-foreground">Resolved</p>
                    <p>{format(new Date(selectedGrievance.resolvedAt), 'd MMM yyyy h:mm a')}</p>
                  </div>
                )}
              </div>

              {selectedGrievance.resolution && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-800">Resolution</p>
                  <p className="text-sm text-green-700 mt-1">{selectedGrievance.resolution}</p>
                </div>
              )}

              {selectedGrievance.adminNotes && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">Admin Notes</p>
                  <p className="text-sm text-blue-700 mt-1">{selectedGrievance.adminNotes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
