const { exec } = require('child_process');
exec('cd C:\\Users\\Lenovo\\Downloads\\siaptk\\node_modules\\.bin\\next dev', { cwd: 'C:\\Users\\Lenovo\\Downloads\\siaptk' }, (error, stdout, stderr) => {
  if (error) {
    console.error('Error:', error.message);
    console.error('Stderr:', stderr);
  } else {
    console.log('Stdout:', stdout ? stdout.substring(0, 3000) : 'empty');
    console.error('Stderr:', stderr ? stderr.substring(0, 3000) : 'empty');
  }
});