import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { userApi, settingsApi, departmentApi, userGroupApi } from '@/lib/api';
import type { User, Department, UserGroup } from '@shared/schema';
import { Plus, Pencil, Trash2, Save, Mail, Users, Settings, Camera, Building2, Loader2, CheckCircle2, UserCog, Shield } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import WebcamCapture from '@/components/WebcamCapture';
import { loadFaceModels, extractFaceDescriptorFromBase64, descriptorToJson } from '@/lib/face-recognition';

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

  const { data: clockInCutoffSetting } = useQuery({
    queryKey: ['settings', 'clock_in_cutoff'],
    queryFn: () => settingsApi.get('clock_in_cutoff'),
  });

  const { data: clockOutCutoffSetting } = useQuery({
    queryKey: ['settings', 'clock_out_cutoff'],
    queryFn: () => settingsApi.get('clock_out_cutoff'),
  });

  const { data: lateArrivalMessageSetting } = useQuery({
    queryKey: ['settings', 'late_arrival_message'],
    queryFn: () => settingsApi.get('late_arrival_message'),
  });

  const { data: earlyDepartureMessageSetting } = useQuery({
    queryKey: ['settings', 'early_departure_message'],
    queryFn: () => settingsApi.get('early_departure_message'),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentApi.getAll,
  });

  const { data: userGroups = [] } = useQuery({
    queryKey: ['userGroups'],
    queryFn: userGroupApi.getAll,
  });
  
  // User Management State
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [extractingFace, setExtractingFace] = useState(false);
  const [faceExtracted, setFaceExtracted] = useState(false);

  // Department Management State
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [currentDept, setCurrentDept] = useState<Partial<Department>>({});
  const [isEditingDept, setIsEditingDept] = useState(false);

  // User Group Management State
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<Partial<UserGroup>>({});
  const [isEditingGroup, setIsEditingGroup] = useState(false);

  // Admin User Creation State
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [adminData, setAdminData] = useState<{
    firstName: string;
    surname: string;
    email: string;
    password: string;
    userGroupId?: number;
  }>({ firstName: '', surname: '', email: '', password: '' });

  // Settings State
  const [emailSettings, setEmailSettings] = useState('');
  const [clockInCutoff, setClockInCutoff] = useState('08:00');
  const [clockOutCutoff, setClockOutCutoff] = useState('17:00');
  const [lateArrivalMessage, setLateArrivalMessage] = useState('{name} (ID: {id}) clocked in late at {time}. Expected by {cutoff}.');
  const [earlyDepartureMessage, setEarlyDepartureMessage] = useState('{name} (ID: {id}) left early at {time}. Expected after {cutoff}.');

  useEffect(() => {
    if (emailSetting) {
      setEmailSettings(emailSetting.value);
    }
  }, [emailSetting]);

  useEffect(() => {
    if (clockInCutoffSetting) {
      setClockInCutoff(clockInCutoffSetting.value);
    }
  }, [clockInCutoffSetting]);

  useEffect(() => {
    if (clockOutCutoffSetting) {
      setClockOutCutoff(clockOutCutoffSetting.value);
    }
  }, [clockOutCutoffSetting]);

  useEffect(() => {
    if (lateArrivalMessageSetting) {
      setLateArrivalMessage(lateArrivalMessageSetting.value);
    }
  }, [lateArrivalMessageSetting]);

  useEffect(() => {
    if (earlyDepartureMessageSetting) {
      setEarlyDepartureMessage(earlyDepartureMessageSetting.value);
    }
  }, [earlyDepartureMessageSetting]);

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

  const createDeptMutation = useMutation({
    mutationFn: departmentApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: "Department Created", description: "Department has been added successfully." });
      setIsDeptDialogOpen(false);
      setCurrentDept({});
      setIsEditingDept(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => departmentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: "Department Updated", description: "Department has been updated successfully." });
      setIsDeptDialogOpen(false);
      setCurrentDept({});
      setIsEditingDept(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteDeptMutation = useMutation({
    mutationFn: departmentApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: "Department Deleted", description: "Department has been removed." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: userGroupApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userGroups'] });
      toast({ title: "User Group Created", description: "User group has been added successfully." });
      setIsGroupDialogOpen(false);
      setCurrentGroup({});
      setIsEditingGroup(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => userGroupApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userGroups'] });
      toast({ title: "User Group Updated", description: "User group has been updated successfully." });
      setIsGroupDialogOpen(false);
      setCurrentGroup({});
      setIsEditingGroup(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: userGroupApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userGroups'] });
      toast({ title: "User Group Deleted", description: "User group has been removed." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const handleSaveUser = () => {
    if (!currentUser.firstName || !currentUser.surname || !currentUser.id || !currentUser.department) {
      toast({ variant: "destructive", title: "Error", description: "First name, surname, ID and department are required" });
      return;
    }

    const userData = { ...currentUser, role: 'worker', photoUrl: currentUser.photoUrl || 'https://github.com/shadcn.png' };

    if (isEditing) {
      updateUserMutation.mutate(userData);
    } else {
      createUserMutation.mutate(userData);
    }
  };

  const handlePhotoCapture = async (imageSrc: string) => {
    setCurrentUser({ ...currentUser, photoUrl: imageSrc });
    setIsCapturingPhoto(false);
    setExtractingFace(true);
    setFaceExtracted(false);
    
    try {
      await loadFaceModels();
      const descriptor = await extractFaceDescriptorFromBase64(imageSrc);
      
      if (descriptor) {
        const faceDescriptor = descriptorToJson(descriptor);
        setCurrentUser(prev => ({ ...prev, photoUrl: imageSrc, faceDescriptor }));
        setFaceExtracted(true);
        toast({ title: "Face Detected", description: "Facial recognition data has been extracted from the photo." });
      } else {
        toast({ variant: "destructive", title: "No Face Detected", description: "Please take a clear photo with your face visible." });
      }
    } catch (err) {
      console.error('Face extraction error:', err);
      toast({ variant: "destructive", title: "Error", description: "Failed to process face recognition." });
    } finally {
      setExtractingFace(false);
    }
  };

  const handleDeleteUser = (id: string) => {
    deleteUserMutation.mutate(id);
  };

  const handleOpenEdit = (user: User) => {
    setCurrentUser(user);
    setIsEditing(true);
    setIsUserDialogOpen(true);
    setFaceExtracted(!!user.faceDescriptor);
    setExtractingFace(false);
  };

  const handleOpenCreate = () => {
    setCurrentUser({});
    setIsEditing(false);
    setIsUserDialogOpen(true);
    setFaceExtracted(false);
    setExtractingFace(false);
  };

  const handleSaveSettings = async () => {
    await updateSettingMutation.mutateAsync({ key: 'admin_email', value: emailSettings });
    await updateSettingMutation.mutateAsync({ key: 'clock_in_cutoff', value: clockInCutoff });
    await updateSettingMutation.mutateAsync({ key: 'clock_out_cutoff', value: clockOutCutoff });
    await updateSettingMutation.mutateAsync({ key: 'late_arrival_message', value: lateArrivalMessage });
    await updateSettingMutation.mutateAsync({ key: 'early_departure_message', value: earlyDepartureMessage });
  };

  const handleSaveDept = () => {
    if (!currentDept.name) {
      toast({ variant: "destructive", title: "Error", description: "Department name is required" });
      return;
    }

    if (isEditingDept && currentDept.id) {
      updateDeptMutation.mutate({ id: currentDept.id, name: currentDept.name, description: currentDept.description });
    } else {
      createDeptMutation.mutate({ name: currentDept.name, description: currentDept.description || undefined });
    }
  };

  const handleOpenEditDept = (dept: Department) => {
    setCurrentDept(dept);
    setIsEditingDept(true);
    setIsDeptDialogOpen(true);
  };

  const handleOpenCreateDept = () => {
    setCurrentDept({});
    setIsEditingDept(false);
    setIsDeptDialogOpen(true);
  };

  const handleDeleteDept = (id: number) => {
    deleteDeptMutation.mutate(id);
  };

  // User Group Handlers
  const handleSaveGroup = () => {
    if (!currentGroup.name) {
      toast({ variant: "destructive", title: "Error", description: "Group name is required" });
      return;
    }

    if (isEditingGroup && currentGroup.id) {
      updateGroupMutation.mutate({ id: currentGroup.id, name: currentGroup.name, description: currentGroup.description });
    } else {
      createGroupMutation.mutate({ name: currentGroup.name, description: currentGroup.description || undefined });
    }
  };

  const handleOpenEditGroup = (group: UserGroup) => {
    setCurrentGroup(group);
    setIsEditingGroup(true);
    setIsGroupDialogOpen(true);
  };

  const handleOpenCreateGroup = () => {
    setCurrentGroup({});
    setIsEditingGroup(false);
    setIsGroupDialogOpen(true);
  };

  const handleDeleteGroup = (id: number) => {
    deleteGroupMutation.mutate(id);
  };

  // Admin User Handlers
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleOpenCreateAdmin = () => {
    setAdminData({
      firstName: '',
      surname: '',
      email: '',
      password: generatePassword(),
      userGroupId: undefined,
    });
    setIsAdminDialogOpen(true);
  };

  const handleSaveAdmin = () => {
    if (!adminData.firstName || !adminData.surname || !adminData.email || !adminData.password) {
      toast({ variant: "destructive", title: "Error", description: "First name, surname, email and password are required" });
      return;
    }

    createUserMutation.mutate({
      id: `ADM${Date.now()}`,
      firstName: adminData.firstName,
      surname: adminData.surname,
      email: adminData.email,
      password: adminData.password,
      role: 'manager',
      userGroupId: adminData.userGroupId,
    }, {
      onSuccess: () => {
        setIsAdminDialogOpen(false);
        setAdminData({ firstName: '', surname: '', email: '', password: '' });
        toast({ title: "Admin Created", description: `Admin user created. Login credentials have been sent to ${adminData.email}` });
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users and system configurations.</p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mb-8">
            <TabsTrigger value="users" className="gap-2" data-testid="tab-users"><Users className="h-4 w-4" /> Employees</TabsTrigger>
            <TabsTrigger value="departments" className="gap-2" data-testid="tab-departments"><Building2 className="h-4 w-4" /> Departments</TabsTrigger>
            <TabsTrigger value="user-groups" className="gap-2" data-testid="tab-user-groups"><Shield className="h-4 w-4" /> User Groups</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings"><Settings className="h-4 w-4" /> Settings</TabsTrigger>
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
                              <img src={user.photoUrl || 'https://github.com/shadcn.png'} alt={`${user.firstName} ${user.surname}`} className="h-full w-full object-cover" />
                            </div>
                            {user.firstName} {user.surname}
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

          <TabsContent value="departments" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Departments</CardTitle>
                  <CardDescription>Manage departments for employee organization</CardDescription>
                </div>
                <Button onClick={handleOpenCreateDept} className="btn-industrial bg-primary text-white" data-testid="button-add-department">
                  <Plus className="mr-2 h-4 w-4" /> Add Department
                </Button>
              </CardHeader>
              <CardContent>
                {departments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No departments created yet. Click "Add Department" to create your first one.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Employees</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments.map((dept) => {
                        const employeeCount = users.filter(u => u.department === dept.name).length;
                        return (
                          <TableRow key={dept.id} data-testid={`row-department-${dept.id}`}>
                            <TableCell className="font-medium">{dept.name}</TableCell>
                            <TableCell className="text-muted-foreground">{dept.description || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{employeeCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEditDept(dept)} data-testid={`button-edit-dept-${dept.id}`}>
                                <Pencil className="h-4 w-4 text-slate-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteDept(dept.id)}
                                disabled={employeeCount > 0}
                                title={employeeCount > 0 ? "Cannot delete department with employees" : "Delete department"}
                                data-testid={`button-delete-dept-${dept.id}`}
                              >
                                <Trash2 className={`h-4 w-4 ${employeeCount > 0 ? 'text-slate-300' : 'text-red-500'}`} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="user-groups" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Groups</CardTitle>
                  <CardDescription>Manage admin user groups for access control</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleOpenCreateAdmin} className="btn-industrial bg-amber-500 hover:bg-amber-600 text-black" data-testid="button-add-admin">
                    <UserCog className="mr-2 h-4 w-4" /> Add Admin User
                  </Button>
                  <Button onClick={handleOpenCreateGroup} className="btn-industrial bg-primary text-white" data-testid="button-add-group">
                    <Plus className="mr-2 h-4 w-4" /> Add Group
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {userGroups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No user groups created yet. Click "Add Group" to create your first one.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Admins</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userGroups.map((group) => {
                        const adminCount = users.filter(u => u.userGroupId === group.id).length;
                        return (
                          <TableRow key={group.id} data-testid={`row-group-${group.id}`}>
                            <TableCell className="font-medium">{group.name}</TableCell>
                            <TableCell className="text-muted-foreground">{group.description || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{adminCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEditGroup(group)} data-testid={`button-edit-group-${group.id}`}>
                                <Pencil className="h-4 w-4 text-slate-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteGroup(group.id)}
                                disabled={adminCount > 0}
                                title={adminCount > 0 ? "Cannot delete group with assigned admins" : "Delete group"}
                                data-testid={`button-delete-group-${group.id}`}
                              >
                                <Trash2 className={`h-4 w-4 ${adminCount > 0 ? 'text-slate-300' : 'text-red-500'}`} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Admin Users</CardTitle>
                <CardDescription>Administrators with system access</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>User Group</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.filter(u => u.role === 'manager').map((admin) => {
                      const group = userGroups.find(g => g.id === admin.userGroupId);
                      return (
                        <TableRow key={admin.id} data-testid={`row-admin-${admin.id}`}>
                          <TableCell className="font-medium">{admin.firstName} {admin.surname}</TableCell>
                          <TableCell>{admin.email}</TableCell>
                          <TableCell>
                            {group ? (
                              <Badge variant="secondary">{group.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(admin.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure email notifications for HR</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-xl">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>HR Email Address</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          value={emailSettings} 
                          onChange={(e) => setEmailSettings(e.target.value)}
                          className="pl-9"
                          placeholder="hr@company.com"
                          data-testid="input-admin-email"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Leave requests and late attendance notifications will be sent to this email.</p>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive an email when a new request is submitted</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Cut-off Times</CardTitle>
                <CardDescription>Set the times for late arrivals and early departures</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-xl">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Clock-In Cut-off Time</Label>
                    <Input 
                      type="time"
                      value={clockInCutoff} 
                      onChange={(e) => setClockInCutoff(e.target.value)}
                      className="w-40"
                      data-testid="input-clock-in-cutoff"
                    />
                    <p className="text-xs text-muted-foreground">Workers clocking in after this time will be marked as late, and HR will be notified.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Clock-Out Cut-off Time</Label>
                    <Input 
                      type="time"
                      value={clockOutCutoff} 
                      onChange={(e) => setClockOutCutoff(e.target.value)}
                      className="w-40"
                      data-testid="input-clock-out-cutoff"
                    />
                    <p className="text-xs text-muted-foreground">Workers clocking out before this time will be flagged for early departure.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Message Templates</CardTitle>
                <CardDescription>Customize the messages sent to HR for attendance infringements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-w-2xl">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Late Arrival Message</Label>
                    <Textarea 
                      value={lateArrivalMessage} 
                      onChange={(e) => setLateArrivalMessage(e.target.value)}
                      rows={3}
                      placeholder="{name} (ID: {id}) clocked in late at {time}. Expected by {cutoff}."
                      data-testid="input-late-arrival-message"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Early Departure Message</Label>
                    <Textarea 
                      value={earlyDepartureMessage} 
                      onChange={(e) => setEarlyDepartureMessage(e.target.value)}
                      rows={3}
                      placeholder="{name} (ID: {id}) left early at {time}. Expected after {cutoff}."
                      data-testid="input-early-departure-message"
                    />
                  </div>

                  <div className="p-3 bg-slate-100 rounded-lg">
                    <p className="text-sm font-medium mb-2">Available placeholders:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span><code className="bg-white px-1 rounded">{'{name}'}</code> - Employee name</span>
                      <span><code className="bg-white px-1 rounded">{'{id}'}</code> - Employee ID</span>
                      <span><code className="bg-white px-1 rounded">{'{department}'}</code> - Department</span>
                      <span><code className="bg-white px-1 rounded">{'{time}'}</code> - Actual clock time</span>
                      <span><code className="bg-white px-1 rounded">{'{cutoff}'}</code> - Cut-off time</span>
                      <span><code className="bg-white px-1 rounded">{'{date}'}</code> - Date</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
                
            <Button onClick={handleSaveSettings} className="btn-industrial">
              <Save className="mr-2 h-4 w-4" /> Save Configuration
            </Button>
          </TabsContent>
        </Tabs>

        {/* Department Dialog */}
        <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditingDept ? 'Edit Department' : 'Add New Department'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deptName" className="text-right">Name</Label>
                <Input 
                  id="deptName" 
                  value={currentDept.name || ''} 
                  onChange={(e) => setCurrentDept({...currentDept, name: e.target.value})}
                  className="col-span-3"
                  placeholder="e.g., Assembly Line"
                  data-testid="input-dept-name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deptDesc" className="text-right">Description</Label>
                <Input 
                  id="deptDesc" 
                  value={currentDept.description || ''} 
                  onChange={(e) => setCurrentDept({...currentDept, description: e.target.value})}
                  className="col-span-3"
                  placeholder="Optional description"
                  data-testid="input-dept-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveDept} data-testid="button-save-department">
                {isEditingDept ? 'Save Changes' : 'Create Department'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Group Dialog */}
        <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditingGroup ? 'Edit User Group' : 'Add New User Group'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="groupName" className="text-right">Name</Label>
                <Input 
                  id="groupName" 
                  value={currentGroup.name || ''} 
                  onChange={(e) => setCurrentGroup({...currentGroup, name: e.target.value})}
                  className="col-span-3"
                  placeholder="e.g., HR Managers"
                  data-testid="input-group-name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="groupDesc" className="text-right">Description</Label>
                <Input 
                  id="groupDesc" 
                  value={currentGroup.description || ''} 
                  onChange={(e) => setCurrentGroup({...currentGroup, description: e.target.value})}
                  className="col-span-3"
                  placeholder="Optional description"
                  data-testid="input-group-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveGroup} data-testid="button-save-group">
                {isEditingGroup ? 'Save Changes' : 'Create User Group'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin User Dialog */}
        <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Admin User</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="adminFirstName" className="text-right">First Name</Label>
                <Input 
                  id="adminFirstName" 
                  value={adminData.firstName}
                  onChange={(e) => setAdminData({...adminData, firstName: e.target.value})}
                  className="col-span-3"
                  data-testid="input-admin-first-name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="adminSurname" className="text-right">Surname</Label>
                <Input 
                  id="adminSurname" 
                  value={adminData.surname}
                  onChange={(e) => setAdminData({...adminData, surname: e.target.value})}
                  className="col-span-3"
                  data-testid="input-admin-surname"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="adminEmail" className="text-right">Email</Label>
                <Input 
                  id="adminEmail"
                  type="email"
                  value={adminData.email}
                  onChange={(e) => setAdminData({...adminData, email: e.target.value})}
                  className="col-span-3"
                  data-testid="input-admin-email-create"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="adminPassword" className="text-right">Password</Label>
                <div className="col-span-3 flex gap-2">
                  <Input 
                    id="adminPassword"
                    value={adminData.password}
                    onChange={(e) => setAdminData({...adminData, password: e.target.value})}
                    className="flex-1 font-mono"
                    data-testid="input-admin-password"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setAdminData({...adminData, password: generatePassword()})}
                  >
                    Generate
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="adminGroup" className="text-right">User Group</Label>
                <div className="col-span-3">
                  <Select 
                    value={adminData.userGroupId?.toString() || ''} 
                    onValueChange={(value) => setAdminData({...adminData, userGroupId: value ? parseInt(value) : undefined})}
                  >
                    <SelectTrigger data-testid="select-admin-group">
                      <SelectValue placeholder="Select a group (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {userGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <Mail className="inline h-4 w-4 mr-2" />
                Login credentials will be emailed to the admin after creation.
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveAdmin} data-testid="button-save-admin">
                Create Admin User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Dialog */}
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firstName" className="text-right">First Name</Label>
                <Input 
                  id="firstName" 
                  value={currentUser.firstName || ''} 
                  onChange={(e) => setCurrentUser({...currentUser, firstName: e.target.value})}
                  className="col-span-3"
                  data-testid="input-first-name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="surname" className="text-right">Surname</Label>
                <Input 
                  id="surname" 
                  value={currentUser.surname || ''} 
                  onChange={(e) => setCurrentUser({...currentUser, surname: e.target.value})}
                  className="col-span-3"
                  data-testid="input-surname"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nickname" className="text-right">Nickname</Label>
                <Input 
                  id="nickname" 
                  value={currentUser.nickname || ''} 
                  onChange={(e) => setCurrentUser({...currentUser, nickname: e.target.value})}
                  className="col-span-3"
                  placeholder="Optional"
                  data-testid="input-nickname"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="id" className="text-right">ID Number</Label>
                <Input 
                  id="id" 
                  value={currentUser.id || ''} 
                  onChange={(e) => setCurrentUser({...currentUser, id: e.target.value})}
                  className="col-span-3"
                  data-testid="input-id-number"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={currentUser.email || ''} 
                  onChange={(e) => setCurrentUser({...currentUser, email: e.target.value})}
                  className="col-span-3"
                  placeholder="Optional"
                  data-testid="input-email"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="mobile" className="text-right">Mobile</Label>
                <Input 
                  id="mobile" 
                  value={currentUser.mobile || ''} 
                  onChange={(e) => setCurrentUser({...currentUser, mobile: e.target.value})}
                  className="col-span-3"
                  placeholder="Optional"
                  data-testid="input-mobile"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="homeAddress" className="text-right">Home Address</Label>
                <Input 
                  id="homeAddress" 
                  value={currentUser.homeAddress || ''} 
                  onChange={(e) => setCurrentUser({...currentUser, homeAddress: e.target.value})}
                  className="col-span-3"
                  placeholder="Optional"
                  data-testid="input-home-address"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="gender" className="text-right">Gender</Label>
                <div className="col-span-3">
                  <Select 
                    value={currentUser.gender || ''} 
                    onValueChange={(value) => setCurrentUser({...currentUser, gender: value})}
                  >
                    <SelectTrigger data-testid="select-gender">
                      <SelectValue placeholder="Select gender (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dept" className="text-right">Department</Label>
                <div className="col-span-3">
                  <Select 
                    value={currentUser.department || ''} 
                    onValueChange={(value) => setCurrentUser({...currentUser, department: value})}
                  >
                    <SelectTrigger data-testid="select-department">
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name} data-testid={`option-dept-${dept.id}`}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {departments.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">No departments available. Create one in the Departments tab first.</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-start gap-4 pt-2">
                <Label className="text-right pt-2">Profile Photo</Label>
                <div className="col-span-3 space-y-3">
                  {currentUser.photoUrl ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-slate-200 relative">
                          <img src={currentUser.photoUrl} alt="Preview" className="h-full w-full object-cover" />
                          {extractingFace && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 className="h-6 w-6 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsCapturingPhoto(true)}
                            disabled={extractingFace}
                          >
                            <Camera className="mr-2 h-4 w-4" /> Retake Photo
                          </Button>
                          {faceExtracted && (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Face recognition ready</span>
                            </div>
                          )}
                          {extractingFace && (
                            <div className="flex items-center gap-1 text-xs text-blue-600">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Extracting face data...</span>
                            </div>
                          )}
                        </div>
                      </div>
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
