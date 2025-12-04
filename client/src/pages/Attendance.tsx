import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import WebcamCapture from '@/components/WebcamCapture';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from '@/lib/mockData';
import { format } from 'date-fns';
import { Clock, MapPin, CheckCircle } from 'lucide-react';

export default function Attendance() {
  const { user, recordAttendance, attendanceLog } = useStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState<'idle' | 'success'>('idle');
  const [lastAction, setLastAction] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClockIn = (imageSrc: string) => {
    recordAttendance('in', imageSrc);
    setLastAction('Clocked In');
    setStatus('success');
    setTimeout(() => setStatus('idle'), 3000);
  };

  const handleClockOut = (imageSrc: string) => {
    recordAttendance('out', imageSrc);
    setLastAction('Clocked Out');
    setStatus('success');
    setTimeout(() => setStatus('idle'), 3000);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-heading font-bold text-primary">
            {format(currentTime, 'HH:mm:ss')}
          </h1>
          <p className="text-xl text-muted-foreground">
            {format(currentTime, 'EEEE, d MMMM yyyy')}
          </p>
        </div>

        {status === 'success' ? (
          <Card className="max-w-md mx-auto bg-green-50 border-green-200 animate-in zoom-in-95">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <CheckCircle className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-green-800">Success!</h3>
                <p className="text-green-700">Successfully {lastAction} at {format(new Date(), 'HH:mm')}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Action Panel */}
            <Card className="border-t-4 border-t-primary shadow-lg">
              <CardHeader>
                <CardTitle className="text-center">Time Clock</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="in" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="in">Clock In</TabsTrigger>
                    <TabsTrigger value="out">Clock Out</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="in" className="space-y-4">
                    <div className="text-center text-sm text-muted-foreground mb-4">
                      Starting your shift? Scan your face below.
                    </div>
                    <WebcamCapture onCapture={handleClockIn} label="Scan to Clock In" />
                  </TabsContent>
                  
                  <TabsContent value="out" className="space-y-4">
                    <div className="text-center text-sm text-muted-foreground mb-4">
                      Ending your shift? Scan your face below.
                    </div>
                    <WebcamCapture onCapture={handleClockOut} label="Scan to Clock Out" />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* History Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Today's Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendanceLog.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No activity recorded today.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {attendanceLog.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-muted/40 rounded border border-border">
                        <div className="flex items-center gap-3">
                           <div className={`w-2 h-10 rounded ${log.type === 'in' ? 'bg-green-500' : 'bg-amber-500'}`} />
                           <div>
                             <div className="font-bold text-sm uppercase">{log.type === 'in' ? 'Clock In' : 'Clock Out'}</div>
                             <div className="text-xs text-muted-foreground flex items-center gap-1">
                               <MapPin className="h-3 w-3" /> Factory Floor 1
                             </div>
                           </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-medium text-lg">
                            {format(new Date(log.timestamp), 'HH:mm')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
