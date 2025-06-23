import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Share, ArrowLeft, Bed, Bath, MapPin, Ruler, Phone, Mail, MessageSquare } from 'lucide-react-native';
import PropertyFeatures from '@/components/property/PropertyFeatures';
import SimilarProperties from '@/components/property/SimilarProperties';
import { PROPERTIES } from '@/data/properties';

const { width } = Dimensions.get('window');

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const property = PROPERTIES.find(p => p.id.toString() === id) || PROPERTIES[0];
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: property.images[selectedImage] }}
            style={styles.mainImage}
            resizeMode="cover"
          />
          
          <View style={styles.imageOverlay}>
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>
              
              <View style={styles.headerButtons}>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => setIsFavorite(!isFavorite)}
                >
                  <Heart 
                    size={24} 
                    color="#fff" 
                    fill={isFavorite ? "#FF6B6B" : "transparent"} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.iconButton}>
                  <Share size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.imageCountBadge}>
              <Text style={styles.imageCountText}>
                {selectedImage + 1}/{property.images.length}
              </Text>
            </View>
          </View>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailContainer}
        >
          {property.images.map((image, index) => (
            <TouchableOpacity 
              key={index}
              onPress={() => setSelectedImage(index)}
              style={[
                styles.thumbnail,
                selectedImage === index && styles.thumbnailSelected
              ]}
            >
              <Image 
                source={{ uri: image }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <View style={styles.contentContainer}>
          <View style={styles.propertyTypeContainer}>
            <Text style={styles.propertyType}>{property.forSale ? 'FOR SALE' : 'FOR RENT'}</Text>
          </View>
          
          <Text style={styles.price}>
            ${property.price.toLocaleString()}
            {!property.forSale && <Text style={styles.period}>/month</Text>}
          </Text>
          
          <Text style={styles.title}>{property.title}</Text>
          
          <View style={styles.location}>
            <MapPin size={16} color="#666" />
            <Text style={styles.locationText}>{property.location}</Text>
          </View>
          
          <View style={styles.featuresRow}>
            <View style={styles.feature}>
              <Bed size={20} color="#0F3460" />
              <Text style={styles.featureText}>{property.bedrooms} Beds</Text>
            </View>
            
            <View style={styles.feature}>
              <Bath size={20} color="#0F3460" />
              <Text style={styles.featureText}>{property.bathrooms} Baths</Text>
            </View>
            
            <View style={styles.feature}>
              <Ruler size={20} color="#0F3460" />
              <Text style={styles.featureText}>{property.size} sq ft</Text>
            </View>
          </View>
          
          <View style={styles.separator} />
          
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{property.description}</Text>
          
          <PropertyFeatures features={property.features} />
          
          <View style={styles.separator} />
          
          <Text style={styles.sectionTitle}>Location</Text>
          <Image 
            source={{ uri: 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }}
            style={styles.mapImage}
            resizeMode="cover"
          />
          
          <View style={styles.separator} />
          
          <Text style={styles.sectionTitle}>Agent</Text>
          <View style={styles.agentCard}>
            <Image 
              source={{ uri: property.agent.photo }}
              style={styles.agentImage}
            />
            
            <View style={styles.agentInfo}>
              <Text style={styles.agentName}>{property.agent.name}</Text>
              <Text style={styles.agentCompany}>{property.agent.company}</Text>
              <View style={styles.agentRating}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Text key={star} style={styles.star}>★</Text>
                ))}
                <Text style={styles.ratingText}>5.0</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.agentButtons}>
            <TouchableOpacity style={[styles.agentButton, styles.messageButton]}>
              <MessageSquare size={20} color="#fff" />
              <Text style={styles.agentButtonText}>Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.agentButton, styles.callButton]}>
              <Phone size={20} color="#fff" />
              <Text style={styles.agentButtonText}>Call Agent</Text>
            </TouchableOpacity>
          </View>
          
          <SimilarProperties 
            properties={PROPERTIES.filter(p => 
              p.id !== property.id && 
              p.propertyType === property.propertyType
            ).slice(0, 4)} 
          />
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerPrice}>
            ${property.price.toLocaleString()}
            {!property.forSale && <Text style={styles.period}>/month</Text>}
          </Text>
          <Text style={styles.footerSubtext}>
            {property.forSale ? 'View Financing Options' : 'Available Now'}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.scheduleButton}>
          <Text style={styles.scheduleButtonText}>Schedule Tour</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  imageCountText: {
    color: '#fff',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  thumbnailContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailSelected: {
    borderColor: '#0F3460',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    padding: 16,
  },
  propertyTypeContainer: {
    backgroundColor: '#0F3460',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginBottom: 8,
  },
  propertyType: {
    color: '#fff',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  price: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    color: '#0F3460',
    marginBottom: 4,
  },
  period: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#333',
    marginBottom: 8,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  featureText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#333',
    marginLeft: 6,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 20,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#0F3460',
    marginBottom: 12,
  },
  description: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  mapImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  agentImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#333',
  },
  agentCompany: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  agentRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    color: '#FFD700',
    fontSize: 16,
    marginRight: 2,
  },
  ratingText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  agentButtons: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  agentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  messageButton: {
    backgroundColor: '#0F3460',
  },
  callButton: {
    backgroundColor: '#38A3A5',
  },
  agentButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#fff',
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  footerPrice: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#0F3460',
  },
  footerSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
  },
  scheduleButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scheduleButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#fff',
  },
});