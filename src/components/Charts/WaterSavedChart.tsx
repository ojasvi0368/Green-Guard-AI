import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface WaterSavedChartProps {
    data: {
        date: string;
        traditional: number;
        smart: number;
    }[];
}

const WaterSavedChart = ({ data }: WaterSavedChartProps) => {

    return (
        <div className="card-glass">
            <h3 style={{ marginBottom: '1rem' }}>Water Saved: Traditional vs Smart Irrigation</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <YAxis label={{ value: 'Water Saved (mm)', angle: -90, position: 'insideLeft', fill: '#6B7280' }} />
                    <Tooltip
                        contentStyle={{
                            background: 'white',
                            border: '2px solid #10B981',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                        }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="traditional" stroke="#EF4444" strokeWidth={2} name="Traditional" />
                    <Line type="monotone" dataKey="smart" stroke="#10B981" strokeWidth={2} name="Smart" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default WaterSavedChart;