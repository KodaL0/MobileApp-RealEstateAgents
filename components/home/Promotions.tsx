import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';

export default function Promotions() {
  const router = useRouter();
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => console.log('Promotion tapped')}
    >
      <Image
        source={{ uri: 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' }}
        style={styles.image}
        resizeMode="cover"
      />
      
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.subtitle}>Limited Time Offer</Text>
          <Text style={styles.title}>30% Off on Premium Listings</Text>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Learn More</Text>
            <ArrowRight size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 16,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 52, 96, 0.75)',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
  },
  subtitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    color: '#fff',
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#fff',
    marginRight: 4,
  },
});