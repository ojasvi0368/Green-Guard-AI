const { spawn } = require('child_process');
const path = require('path');

/**
 * Crop Recommendation Service
 * Handles communication with the Python ML model
 */
const getRecommendation = async (data) => {
    return new Promise((resolve, reject) => {
        // Path to the python prediction script
        const scriptPath = path.join(process.cwd(), 'ml', 'predict_crop.py');

        // Spawn python process
        const pythonProcess = spawn('python', [scriptPath], {
            cwd: process.cwd(),
        });

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        // Send JSON input to python script via stdin
        pythonProcess.stdin.write(JSON.stringify({
            N: Number(data.nitrogen),
            P: Number(data.phosphorus),
            K: Number(data.potassium),
            temperature: Number(data.temperature),
            humidity: Number(data.humidity),
            ph: Number(data.ph),
            rainfall: Number(data.rainfall)
        }));
        pythonProcess.stdin.end();

        // Handle process completion
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python process exited with code ${code}`);
                console.error(`Stderr: ${stderr}`);
                return reject(new Error(stderr || 'Python prediction failed'));
            }

            try {
                const result = JSON.parse(stdout.trim());
                if (result.error) {
                    return reject(new Error(result.error));
                }
                resolve(result);
            } catch (err) {
                console.error('Failed to parse Python output:', stdout);
                reject(new Error('Invalid output from prediction model'));
            }
        });

        pythonProcess.on('error', (err) => {
            reject(new Error(`Failed to start Python process: ${err.message}`));
        });

        // Set a timeout (increased for robustness)
        setTimeout(() => {
            pythonProcess.kill();
            reject(new Error('Prediction timed out after 30 seconds. Please try again.'));
        }, 30000);
    });
};

module.exports = {
    getRecommendation
};
