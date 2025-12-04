import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { userApi, settingsApi } from '@/lib/api';
import type { User } from '@shared/schema';
import { Plus, Pencil, Trash2, Save, Mail, Users, Settings, Camera } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import WebcamCapture from '@/components/WebcamCapture';

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getAll,
  });

  const { data: emailSetting } = useQuery({
    queryKey: ['settings', 'admin_email'],
    queryFn: () => settingsApi.get('admin_email'),
  });
  
  // User Management State
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);

  // Settings State
  const [emailSettings, setEmailSettings] = useState('');

  useEffect(() => {
    if (emailSetting) {
      setEmailSettings(emailSetting.value);
    }
  }, [emailSetting]);

  const createUserMutation = useMutation({
    mutationFn: userApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "User Created", description: "User has been added successfully." });
      setIsUserDialogOpen(false);
      setCurrentUser({});
      setIsEditing(false);
      setIsCapturingPhoto(false);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => userApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "User Updated", description: "User has been updated successfully." });
      setIsUserDialogOpen(false);
      setCurrentUser({});
      setIsEditing(false);
      setIsCapturingPhoto(false);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: userApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "User Deleted", description: "User has been removed from the system." });
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => settingsApi.set(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: "Settings Saved", description: "Email configuration updated." });
    },
  });

  const handleSaveUser = () => {
    if (!currentUser.name || !currentUser.id || !currentUser.department) {
      toast({ variant: "destructive", title: "Error", description: "All fields are required" });
      return;
    }

    const userData = { ...currentUser, role: 'worker', photoUrl: currentUser.photoUrl || 'https://github.com/shadcn.png' };

    if (isEditing) {
      updateUserMutation.mutate(userData);
    } else {
      createUserMutation.mutate(userData);
    }
  };

  const handlePhotoCapture = (imageSrc: string) => {
    setCurrentUser({ ...currentUser, photoUrl: imageSrc });
    setIsCapturingPhoto(false);
  };

  const handleDeleteUser = (id: string) => {
    deleteUserMutation.mutate(id);
  };

  const handleOpenEdit = (user: User) => {
    setCurrentUser(user);
    setIsEditing(true);
    setIsUserDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setCurrentUser({});
    setIsEditing(false);
    setIsUserDialogOpen(true);
  };

  const handleSaveSettings = () => {
    updateSettingMutation.mutate({ key: 'admin_email', value: emailSettings });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users and system configurations.</p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mb-8">
            <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> User Management</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" /> System Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Employees</CardTitle>
                  <CardDescription>Manage worker access and IDs</CardDescription>
                </div>
                <Button onClick={handleOpenCreate} className="btn-industrial bg-primary text-white">
                  <Plus className="mr-2 h-4 w-4" /> Add Employee
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono font-medium">{user.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full overflow-hidden bg-slate-100">
                              <img src={user.photoUrl || 'https://github.com/shadcn.png'} alt={user.name} className="h-full w-full object-cover" />
                            </div>
                            {user.name}
                          </div>
                        </TableCell>
                        <TableCell>{user.department}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'manager' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(user)}>
                            <Pencil className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure where leave requests are sent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-xl">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Admin Email Address</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          value={emailSettings} 
                          onChange={(e) => setEmailSettings(e.target.value)}
                          className="pl-9" 
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">All leave requests will be forwarded to this email address.</p>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive an email when a new request is submitted</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                    <div className="space-y-0.5">
                      <Label className="text-base">Daily Digest</Label>
                      <p className="text-sm text-muted-foreground">Receive a summary of all attendance at 5 PM</p>
                    </div>
                    <Switch />
                  </div>
                </div>
                
                <Button onClick={handleSaveSettings} className="btn-industrial">
                  <Save className="mr-2 h-4 w-4" /> Save Configuration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Dialog */}
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input 
                  id="name" 
                  value={currentUser.name || ''} 
                  onChange={(e) => setCurrentUser({...currentUser, name: e.target.value})}
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="id" className="text-right">ID Number</Label>
                <Input 
                  id="id" 
                  value={currentUser.id || ''} 
                  onChange={(e) => setCurrentUser({...currentUser, id: e.target.value})}
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dept" className="text-right">Department</Label>
                <Input 
                  id="dept" 
                  value={currentUser.department || ''} 
                  onChange={(e) => setCurrentUser({...currentUser, department: e.target.value})}
                  className="col-span-3" 
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4 pt-2">
                <Label className="text-right pt-2">Profile Photo</Label>
                <div className="col-span-3 space-y-3">
                  {currentUser.photoUrl ? (
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-slate-200">
                        <img src={currentUser.photoUrl} alt="Preview" className="h-full w-full object-cover" />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsCapturingPhoto(true)}
                      >
                        <Camera className="mr-2 h-4 w-4" /> Retake Photo
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full border-dashed py-8"
                      onClick={() => setIsCapturingPhoto(true)}
                    >
                      <Camera className="mr-2 h-5 w-5" /> Take Photo for Facial Rec
                    </Button>
                  )}
                  
                  {isCapturingPhoto && (
                     <div className="border rounded-lg p-2 bg-slate-50 mt-2">
                        <WebcamCapture onCapture={handlePhotoCapture} label="Capture Profile Photo" />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full mt-2 text-red-500 hover:text-red-600"
                          onClick={() => setIsCapturingPhoto(false)}
                        >
                          Cancel Camera
                        </Button>
                     </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveUser}>{isEditing ? 'Save Changes' : 'Create User'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
