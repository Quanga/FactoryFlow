import { useState } from 'react';
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
import { useStore, User } from '@/lib/mockData';
import { Plus, Pencil, Trash2, Save, Mail, Users, Settings } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const { users, addUser, updateUser, deleteUser, settings, updateSettings } = useStore();
  const { toast } = useToast();
  
  // User Management State
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Settings State
  const [emailSettings, setEmailSettings] = useState(settings.email);

  const handleSaveUser = () => {
    if (!currentUser.name || !currentUser.id || !currentUser.department) {
      toast({ variant: "destructive", title: "Error", description: "All fields are required" });
      return;
    }

    if (isEditing) {
      updateUser(currentUser as User);
      toast({ title: "User Updated", description: `${currentUser.name} has been updated.` });
    } else {
      addUser({ ...currentUser, role: 'worker', photoUrl: 'https://github.com/shadcn.png' } as User);
      toast({ title: "User Created", description: `${currentUser.name} has been added.` });
    }
    setIsUserDialogOpen(false);
    setCurrentUser({});
    setIsEditing(false);
  };

  const handleDeleteUser = (id: string) => {
    deleteUser(id);
    toast({ title: "User Deleted", description: "User has been removed from the system." });
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
    updateSettings({ email: emailSettings });
    toast({ title: "Settings Saved", description: "Email configuration updated." });
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
                              <img src={user.photoUrl} alt={user.name} className="h-full w-full object-cover" />
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
