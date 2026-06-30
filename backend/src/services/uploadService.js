class UploadService {
  fileUrl(req, file) {
    const relativePath = file.path.replace(process.cwd(), '').replaceAll('\\', '/');
    return `${req.protocol}://${req.get('host')}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
  }
}

module.exports = new UploadService();
