import os

file_path = r'c:\Users\Elif\OneDrive\Desktop\nisa\views\anasayfa.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove everything after the first </html>
if '</html>' in content:
    parts = content.split('</html>')
    new_content = parts[0] + '</html>\n'
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("File cleaned successfully.")
else:
    print("</html> not found.")
