import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import {
  FileText,
  File,
  Image as ImageIcon,
  FileType2,
  Sheet,
} from 'lucide-react-native';

interface PropertyDocument {
  id: number;
  document: string;
  document_type: string;
  title: string;
  description?: string;
  file_size?: number;
  file_extension?: string;
  formatted_file_size?: string;
  uploaded_at: string;
}

interface PropertyDocumentsProps {
  documents: PropertyDocument[];
}

// Document type labels
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'floor_plan': 'Floor Plan',
  'energy_certificate': 'Energy Certificate',
  'title_deed': 'Title Deed',
  'building_permit': 'Building Permit',
  'contract': 'Contract',
  'inspection_report': 'Inspection Report',
  'other': 'Other',
};

// Helper: Get file icon component
const getFileTypeIcon = (extension?: string, size: number = 24) => {
  if (!extension) return <File size={size} color="#666" />;
  
  const ext = extension.toLowerCase();
  if (ext === '.pdf') return <FileText size={size} color="#DC2626" />;
  if (ext === '.doc' || ext === '.docx') return <FileType2 size={size} color="#2563EB" />;
  if (ext === '.xls' || ext === '.xlsx') return <Sheet size={size} color="#16A34A" />;
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif') {
    return <ImageIcon size={size} color="#9333EA" />;
  }
  
  return <File size={size} color="#666" />;
};

// Helper: Get file color
const getFileColor = (extension?: string): string => {
  if (!extension) return '#666';
  
  const ext = extension.toLowerCase();
  if (ext === '.pdf') return '#DC2626';
  if (ext === '.doc' || ext === '.docx') return '#2563EB';
  if (ext === '.xls' || ext === '.xlsx') return '#16A34A';
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif') return '#9333EA';
  
  return '#666';
};

const DocumentCard: React.FC<{ doc: PropertyDocument; onPress: () => void }> = ({ doc, onPress }) => {
  const fileColor = getFileColor(doc.file_extension);
  
  return (
    <TouchableOpacity
      style={styles.documentCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${fileColor}15` }]}>
        {getFileTypeIcon(doc.file_extension, 28)}
      </View>
      
      <Text style={styles.documentTitle} numberOfLines={2}>
        {doc.title}
      </Text>
      
      {doc.file_extension && (
        <Text style={[styles.fileExtension, { color: fileColor }]}>
          {doc.file_extension.replace('.', '').toUpperCase()}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default function PropertyDocuments({ documents }: PropertyDocumentsProps) {
  if (!documents || documents.length === 0) return null;

  const handleOpenDocument = async (doc: PropertyDocument) => {
    try {
      const url = doc.document.startsWith('http')
        ? doc.document
        : `https://api.propertpro.com${doc.document}`;
      
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this document. Please try again later.');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert('Error', 'Failed to open document. Please try again.');
    }
  };

  // Group documents by type
  const groupedDocs: Record<string, PropertyDocument[]> = {};
  documents.forEach(doc => {
    const type = doc.document_type || 'other';
    if (!groupedDocs[type]) groupedDocs[type] = [];
    groupedDocs[type].push(doc);
  });

  // Separate categorized docs from "other" docs
  const otherDocs = groupedDocs['other'] || [];
  const categorizedDocs = Object.entries(groupedDocs).filter(([type]) => type !== 'other');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <FileText size={20} color="#0F3460" />
        <Text style={styles.headerTitle}>Available Documents</Text>
      </View>
      
      <View style={styles.content}>
        {/* Categorized Documents */}
        {categorizedDocs.map(([type, docs]) => (
          <View key={type} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>
              {DOCUMENT_TYPE_LABELS[type] || type}
            </Text>
            <View style={styles.documentGrid}>
              {docs.map(doc => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onPress={() => handleOpenDocument(doc)}
                />
              ))}
            </View>
          </View>
        ))}

        {/* "Other" Documents */}
        {otherDocs.length > 0 && (
          <View style={[styles.categorySection, categorizedDocs.length > 0 && styles.otherSection]}>
            <View style={styles.documentGrid}>
              {otherDocs.map(doc => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onPress={() => handleOpenDocument(doc)}
                />
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#0F3460',
    marginLeft: 8,
  },
  content: {
    padding: 16,
  },
  categorySection: {
    marginBottom: 20,
  },
  otherSection: {
    marginTop: 8,
  },
  categoryTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  documentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  documentCard: {
    width: '30%',
    margin: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  documentTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 32,
  },
  fileExtension: {
    fontFamily: 'Poppins-Bold',
    fontSize: 10,
    textTransform: 'uppercase',
  },
});

