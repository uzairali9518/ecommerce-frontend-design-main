/**
 * Alpha Store - Main JavaScript File
 * Includes cart functionality, checkout processing, and order management
 */

// Cart array to store items
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// DOM Elements
const cartCountElements = document.querySelectorAll('.cart-count, nav a[href="cart.html"]');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElement = document.querySelector('#cart-total p');
const checkoutForm = document.getElementById('checkout-form');
const checkoutButton = document.getElementById('checkout-button');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    updateCartCount();
    
    // Initialize page-specific functionality
    if (window.location.pathname.includes('cart.html')) {
        displayCartItems();
        initCheckoutButton();
    }
    
    if (window.location.pathname.includes('checkout.html')) {
        initCheckoutPage();
    }
    
    if (window.location.pathname.includes('order-confirmation.html')) {
        displayOrderConfirmation();
    }
});

// Cart Functions
function addToCart(name, price) {
    const existingItem = cart.find(item => item.name === name);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ 
            name, 
            price, 
            quantity: 1,
            image: getProductImage(name) // Helper function to get image
        });
    }
    
    updateCart();
    showAddToCartFeedback(name);
}

function removeFromCart(name) {
    cart = cart.filter(item => item.name !== name);
    updateCart();
}

function updateCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    
    if (window.location.pathname.includes('cart.html')) {
        displayCartItems();
    }
}

function calculateTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
}

function clearCart() {
    cart = [];
    updateCart();
}

// Display Functions
function displayCartItems() {
    if (!cartItemsContainer) return;
    
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart">Your cart is empty.</p>';
        return;
    }
    
    cart.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div class="cart-item-image">
                <img src="${item.image || 'assets/images/default-product.jpg'}" alt="${item.name}">
            </div>
            <div class="cart-item-info">
                <h3>${item.name}</h3>
                <p>$${item.price.toFixed(2)} × ${item.quantity}</p>
                <p class="item-total">$${(item.price * item.quantity).toFixed(2)}</p>
            </div>
            <div class="cart-item-actions">
                <button class="quantity-btn minus" onclick="updateQuantity('${item.name}', -1)">−</button>
                <span class="quantity">${item.quantity}</span>
                <button class="quantity-btn plus" onclick="updateQuantity('${item.name}', 1)">+</button>
                <button class="remove-btn" onclick="removeFromCart('${item.name}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        cartItemsContainer.appendChild(itemElement);
    });
    
    if (cartTotalElement) {
        cartTotalElement.innerHTML = `Total: <span>$${calculateTotal()}</span>`;
    }
}

function updateQuantity(name, change) {
    const item = cart.find(item => item.name === name);
    if (item) {
        item.quantity += change;
        
        // Remove if quantity reaches 0
        if (item.quantity <= 0) {
            removeFromCart(name);
        } else {
            updateCart();
        }
    }
}

function updateCartCount() {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    
    cartCountElements.forEach(el => {
        if (el.classList.contains('cart-count')) {
            el.textContent = totalItems;
        } else {
            // Update the "Cart (X)" link text
            const linkText = el.textContent.replace(/\(\d+\)/, `(${totalItems})`);
            el.textContent = linkText;
        }
    });
}

// Checkout Functions
function initCheckoutButton() {
    if (checkoutButton) {
        checkoutButton.addEventListener('click', proceedToCheckout);
    }
}

function proceedToCheckout() {
    if (cart.length === 0) {
        alert("Your cart is empty. Please add some products before checkout.");
        return;
    }
    
    // Save cart data to session storage for checkout page
    sessionStorage.setItem('cartItems', JSON.stringify(cart));
    sessionStorage.setItem('cartTotal', calculateTotal());
    
    window.location.href = 'checkout.html';
}

function initCheckoutPage() {
    if (!checkoutForm) return;
    
    // Load cart data from session storage
    const cartItems = JSON.parse(sessionStorage.getItem('cartItems')) || [];
    const cartTotal = sessionStorage.getItem('cartTotal') || '0.00';
    
    // Add order summary to checkout page
    const orderSummary = document.createElement('div');
    orderSummary.className = 'order-summary';
    orderSummary.innerHTML = `
        <h3>Order Summary</h3>
        <div id="checkout-items"></div>
        <p class="checkout-total">Total: $${cartTotal}</p>
    `;
    
    checkoutForm.insertBefore(orderSummary, checkoutForm.firstChild);
    
    // Display items in order summary
    const checkoutItemsContainer = document.getElementById('checkout-items');
    checkoutItemsContainer.innerHTML = '';
    
    cartItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'checkout-item';
        itemElement.innerHTML = `
            <p>${item.name} (${item.quantity} × $${item.price.toFixed(2)})</p>
            <p>$${(item.price * item.quantity).toFixed(2)}</p>
        `;
        checkoutItemsContainer.appendChild(itemElement);
    });
    
    // Handle form submission
    checkoutForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            customer: {
                name: this.elements['fullname'].value.trim(),
                email: this.elements['email'].value.trim(),
                phone: this.elements['phone'].value.trim(),
                address: this.elements['address'].value.trim(),
                city: this.elements['city'].value.trim(),
                state: this.elements['state'].value.trim(),
                zip: this.elements['zip'].value.trim(),
                country: this.elements['country'].value.trim()
            },
            payment: {
                cardname: this.elements['cardname'].value.trim(),
                cardnumber: this.elements['cardnumber'].value.trim(),
                expiry: this.elements['expiry'].value.trim(),
                cvv: this.elements['cvv'].value.trim()
            },
            items: cartItems,
            total: cartTotal
        };
        
        // Validate form
        if (!validateCheckoutForm(formData)) {
            return;
        }
        
        // Submit order to server
        try {
            const response = await submitOrder(formData);
            
            if (response.success) {
                // Clear cart and redirect to confirmation
                clearCart();
                sessionStorage.setItem('orderId', response.orderId);
                window.location.href = `order-confirmation.html?orderId=${response.orderId}`;
            } else {
                alert(`Order failed: ${response.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Order submission error:', error);
            alert('Failed to submit order. Please try again.');
        }
    });
}

async function submitOrder(orderData) {
    // In a real application, this would send data to your backend
    // For now, we'll simulate a successful response
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a random order ID for demo purposes
    const orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
    
    return {
        success: true,
        orderId: orderId,
        message: 'Order placed successfully'
    };
    
    /* 
    // Real implementation would look something like this:
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });
        
        return await response.json();
    } catch (error) {
        throw error;
    }
    */
}

function validateCheckoutForm(formData) {
    // Check required fields
    if (!formData.customer.name || 
        !formData.customer.email || 
        !formData.customer.address ||
        !formData.payment.cardnumber) {
        alert('Please fill in all required fields.');
        return false;
    }
    
    // Simple email validation
    if (!/^\S+@\S+\.\S+$/.test(formData.customer.email)) {
        alert('Please enter a valid email address.');
        return false;
    }
    
    // Simple credit card validation (demo only - use proper validation in production)
    if (formData.payment.cardnumber.replace(/\s/g, '').length !== 16) {
        alert('Please enter a valid 16-digit credit card number.');
        return false;
    }
    
    return true;
}

// Order Confirmation
function displayOrderConfirmation() {
    const orderId = new URLSearchParams(window.location.search).get('orderId') || 
                   sessionStorage.getItem('orderId') || 
                   'DEMO-12345';
    
    const orderIdElement = document.getElementById('order-id');
    const confirmationItems = document.getElementById('confirmation-items');
    const confirmationTotal = document.getElementById('confirmation-total');
    
    if (orderIdElement) {
        orderIdElement.textContent = orderId;
    }
    
    // Load cart items from session storage
    const cartItems = JSON.parse(sessionStorage.getItem('cartItems')) || [];
    const cartTotal = sessionStorage.getItem('cartTotal') || '0.00';
    
    if (confirmationItems) {
        confirmationItems.innerHTML = '';
        
        cartItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'confirmation-item';
            itemElement.innerHTML = `
                <p>${item.name}</p>
                <p>${item.quantity} × $${item.price.toFixed(2)}</p>
                <p>$${(item.price * item.quantity).toFixed(2)}</p>
            `;
            confirmationItems.appendChild(itemElement);
        });
    }
    
    if (confirmationTotal) {
        confirmationTotal.textContent = cartTotal;
    }
    
    // Clear session storage after displaying confirmation
    sessionStorage.removeItem('cartItems');
    sessionStorage.removeItem('cartTotal');
    sessionStorage.removeItem('orderId');
}

// Helper Functions
function getProductImage(productName) {
    // Map product names to image paths
    const productImages = {
        'Product 1': 'assets/images/image1.jpg',
        'Product 2': 'assets/images/image2.jpg',
        'Product 3': 'assets/images/image3.jpg',
        'Product 4': 'assets/images/image4.jpg',
        'Product 5': 'assets/images/image5.jpg',
        'Product 6': 'assets/images/image6.jpg',
        'Product 7': 'assets/images/image7.jpg',
        'Product 8': 'assets/images/image8.jpg',
        'Product 9': 'assets/images/image9.jpg',
        'Product 10': 'assets/images/image10.jpg',
    };
    
    return productImages[productName] || 'assets/images/default-product.jpg';
}

function showAddToCartFeedback(productName) {
    // Create feedback element
    const feedback = document.createElement('div');
    feedback.className = 'add-to-cart-feedback';
    feedback.innerHTML = `
        <p>${productName} added to cart!</p>
    `;
    
    document.body.appendChild(feedback);
    
    // Show and then fade out
    setTimeout(() => {
        feedback.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        feedback.classList.remove('show');
        setTimeout(() => {
            feedback.remove();
        }, 300);
    }, 2000);
}

// Make functions available globally
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
