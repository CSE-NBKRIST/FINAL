import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Users, BookOpen, MessageSquare, Award, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalExperiments: 0,
    completedExperiments: 0,
    vivaAttempts: 0,
    sectionWiseStudents: [] as { name: string; value: number; color: string }[],
    experimentProgress: [] as { name: string; value: number; color: string }[],
    vivaProgress: [] as { name: string; value: number; color: string }[]
  });

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

  useEffect(() => {
    const fetchStats = async () => {
      if (!userProfile) return;

      try {
        if (userProfile.role === 'faculty') {
          // Fetch students enrolled by this faculty
          const studentsQuery = query(
            collection(db, 'students'),
            where('facultyId', '==', userProfile.uid)
          );
          const studentsSnapshot = await getDocs(studentsQuery);
          const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // Calculate section-wise distribution
          const sectionMap = new Map();
          students.forEach((student: any) => {
            const section = student.section || 'Unknown';
            sectionMap.set(section, (sectionMap.get(section) || 0) + 1);
          });

          const sectionData = Array.from(sectionMap.entries()).map(([section, count], index) => ({
            name: section,
            value: count as number,
            color: colors[index % colors.length]
          }));

          // Fetch experiments
          const experimentsQuery = query(
            collection(db, 'experiments'),
            where('facultyId', '==', userProfile.uid)
          );
          const experimentsSnapshot = await getDocs(experimentsQuery);
          const experiments = experimentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // Calculate experiment completion stats
          const totalExperiments = experiments.length;
          let totalCompletions = 0;
          students.forEach((student: any) => {
            totalCompletions += (student.experimentsCompleted || []).length;
          });

          setStats({
            totalStudents: students.length,
            totalExperiments: experiments.length,
            completedExperiments: totalCompletions,
            vivaAttempts: 0, // Will be calculated from viva attempts collection
            sectionWiseStudents: sectionData,
            experimentProgress: [
              { name: 'Completed', value: totalCompletions, color: '#10B981' },
              { name: 'Pending', value: Math.max(0, (students.length * totalExperiments) - totalCompletions), color: '#F59E0B' }
            ],
            vivaProgress: [
              { name: 'Attempted', value: 30, color: '#3B82F6' },
              { name: 'Not Attempted', value: 70, color: '#E5E7EB' }
            ]
          });
        } else {
          // Student dashboard stats
          const studentData = userProfile as any;
          const completedExperiments = studentData.experimentsCompleted?.length || 0;
          const vivaScores = Object.keys(studentData.vivaScores || {}).length;

          setStats({
            totalStudents: 0,
            totalExperiments: 5, // Assumed total experiments
            completedExperiments,
            vivaAttempts: vivaScores,
            sectionWiseStudents: [],
            experimentProgress: [
              { name: 'Completed', value: completedExperiments, color: '#10B981' },
              { name: 'Remaining', value: Math.max(0, 5 - completedExperiments), color: '#F59E0B' }
            ],
            vivaProgress: [
              { name: 'Attempted', value: vivaScores, color: '#3B82F6' },
              { name: 'Remaining', value: Math.max(0, 5 - vivaScores), color: '#E5E7EB' }
            ]
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [userProfile]);

  if (!userProfile) return null;

  const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string }> = 
    ({ title, value, icon, color }) => (
      <div className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            {icon}
          </div>
        </div>
      </div>
    );

  const PieChartCard: React.FC<{ title: string; data: any[]; }> = ({ title, data }) => (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          {userProfile.role === 'faculty' ? 'Faculty Dashboard' : 'Student Dashboard'}
        </h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <TrendingUp className="h-4 w-4" />
          <span>Real-time Analytics</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {userProfile.role === 'faculty' ? (
          <>
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              icon={<Users className="h-6 w-6 text-white" />}
              color="bg-blue-500"
            />
            <StatCard
              title="Total Experiments"
              value={stats.totalExperiments}
              icon={<BookOpen className="h-6 w-6 text-white" />}
              color="bg-green-500"
            />
            <StatCard
              title="Completed Experiments"
              value={stats.completedExperiments}
              icon={<Award className="h-6 w-6 text-white" />}
              color="bg-yellow-500"
            />
            <StatCard
              title="Viva Attempts"
              value={stats.vivaAttempts}
              icon={<MessageSquare className="h-6 w-6 text-white" />}
              color="bg-purple-500"
            />
          </>
        ) : (
          <>
            <StatCard
              title="Experiments Completed"
              value={stats.completedExperiments}
              icon={<BookOpen className="h-6 w-6 text-white" />}
              color="bg-green-500"
            />
            <StatCard
              title="Viva Questions Attempted"
              value={stats.vivaAttempts}
              icon={<MessageSquare className="h-6 w-6 text-white" />}
              color="bg-blue-500"
            />
            <StatCard
              title="Total Experiments"
              value={stats.totalExperiments}
              icon={<Award className="h-6 w-6 text-white" />}
              color="bg-yellow-500"
            />
            <StatCard
              title="Success Rate"
              value={Math.round((stats.completedExperiments / stats.totalExperiments) * 100)}
              icon={<TrendingUp className="h-6 w-6 text-white" />}
              color="bg-purple-500"
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {userProfile.role === 'faculty' && stats.sectionWiseStudents.length > 0 && (
          <PieChartCard title="Students by Section" data={stats.sectionWiseStudents} />
        )}
        <PieChartCard title="Experiment Progress" data={stats.experimentProgress} />
        <PieChartCard title="Viva Progress" data={stats.vivaProgress} />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">New experiment added</p>
              <p className="text-xs text-gray-600">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Student submission received</p>
              <p className="text-xs text-gray-600">5 hours ago</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Viva questions updated</p>
              <p className="text-xs text-gray-600">1 day ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;